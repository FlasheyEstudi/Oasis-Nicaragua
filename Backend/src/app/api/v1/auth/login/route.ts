// OASIS - Auth Login API Route
// POST /api/v1/auth/login - User login with rate limiting and fail-lockout security

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, loginSchema } from '@/lib/validators';
import * as authService from '@/lib/services/auth.service';
import { checkLoginLock, recordLoginFail, resetLoginFails } from '@/lib/security/rate-limiter';
import { withPublicRateLimit } from '@/lib/auth/middleware';

export const POST = withPublicRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const validation = validateBody(loginSchema, body);
    if (!validation.success) return validation.error;

    const { email, password } = validation.data;
    const identityKey = email.trim().toLowerCase();

    // 1. Verificar bloqueo por intentos fallidos
    const lockCheck = checkLoginLock(identityKey);
    if (lockCheck.locked) {
      const minutesLeft = Math.ceil(lockCheck.lockedRemainingMs / 60000);
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        `Cuenta bloqueada temporalmente por exceso de intentos fallidos. Reintente en ${minutesLeft} minutos.`,
        null,
        403
      );
    }

    try {
      const result = await authService.login(
        email,
        password,
        req.headers.get('x-forwarded-for') || undefined,
        req.headers.get('user-agent') || undefined
      );

      // Resetear intentos fallidos tras login exitoso
      resetLoginFails(identityKey);

      const { refresh_token, ...data } = result;
      const response = successResponse(data, 'Login procesado correctamente');
      
      if (refresh_token) {
        response.cookies.set('refresh_token', refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 días
        });
      }
      return response;
    } catch (error: any) {
      if (error.message === 'INVALID_CREDENTIALS') {
        // Registrar intento fallido
        recordLoginFail(identityKey);
        return errorResponse(ErrorCodes.INVALID_CREDENTIALS, 'Credenciales inválidas', null, 401);
      }
      throw error; // Dejar que suba y sea manejado globalmente
    }
  } catch (error: any) {
    if (error.message === 'USER_INACTIVE') return errorResponse(ErrorCodes.USER_INACTIVE, 'Cuenta desactivada', null, 403);
    if (error.message === '2FA_LOCKED') return errorResponse(ErrorCodes.FORBIDDEN, 'Acceso bloqueado por intentos fallidos de 2FA. Reintente más tarde.', null, 403);
    throw error;
  }
});
