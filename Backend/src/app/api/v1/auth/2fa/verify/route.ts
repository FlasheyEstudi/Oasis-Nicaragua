import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { verifyAccessToken } from '@/lib/auth/jwt';
import * as authService from '@/lib/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    const { userId, code } = await req.json();
    if (!code) return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Código 2FA requerido', null, 400);

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const payload = token ? verifyAccessToken(token) : null;

    if (payload) {
      // Flujo 1: Confirmar activación de 2FA (en el perfil de usuario)
      const result = await authService.confirm2FA(payload.userId, code);
      if (!result.success) return errorResponse(ErrorCodes.TWO_FACTOR_INVALID, 'Código de verificación 2FA incorrecto', null, 400);
      return successResponse({ active: true }, 'Autenticación de doble factor (2FA) activada con éxito');
    } else {
      // Flujo 2: Verificación de 2FA durante el inicio de sesión (ruta pública)
      if (!userId) return errorResponse(ErrorCodes.VALIDATION_ERROR, 'ID de usuario requerido', null, 400);
      
      const result = await authService.verify2FA(
        userId,
        code,
        req.headers.get('x-forwarded-for') || undefined,
        req.headers.get('user-agent') || undefined
      );

      const { refresh_token, ...data } = result;
      const response = successResponse(data, 'Inicio de sesión 2FA completado con éxito');
      
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
    }
  } catch (error: any) {
    if (error.message === 'NO_PENDING_2FA') return errorResponse(ErrorCodes.BAD_REQUEST, 'No hay ninguna solicitud 2FA pendiente de activación', null, 400);
    if (error.message === 'INVALID_2FA_CODE') return errorResponse(ErrorCodes.TWO_FACTOR_INVALID, 'Código 2FA incorrecto o expirado', null, 400);
    if (error.message === '2FA_LOCKED') return errorResponse(ErrorCodes.FORBIDDEN, 'Acceso bloqueado por intentos fallidos. Reintente más tarde.', null, 403);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno al procesar el 2FA', null, 500);
  }
}
