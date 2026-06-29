import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, loginSchema } from '@/lib/validators';
import * as authService from '@/lib/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(loginSchema, body);
    if (!validation.success) return validation.error;

    const result = await authService.login(
      body.email,
      body.password,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

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
    if (error.message === 'INVALID_CREDENTIALS') return errorResponse(ErrorCodes.INVALID_CREDENTIALS, 'Credenciales inválidas', null, 401);
    if (error.message === 'USER_INACTIVE') return errorResponse(ErrorCodes.USER_INACTIVE, 'Cuenta desactivada', null, 403);
    if (error.message === '2FA_LOCKED') return errorResponse(ErrorCodes.FORBIDDEN, 'Acceso bloqueado por intentos fallidos. Reintente más tarde.', null, 403);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', null, 500);
  }
}
