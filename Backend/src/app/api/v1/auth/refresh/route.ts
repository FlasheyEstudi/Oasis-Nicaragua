import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import * as authService from '@/lib/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    let token = req.cookies.get('refresh_token')?.value;
    if (!token) {
      try { token = (await req.json()).refresh_token; } catch {}
    }
    if (!token) return errorResponse(ErrorCodes.TOKEN_INVALID, 'Token de refresco requerido', null, 401);

    const result = await authService.refreshTokens(token);
    const { refresh_token, ...data } = result;
    const response = successResponse(data, 'Token renovado con éxito');
    
    response.cookies.set('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 días
    });
    return response;
  } catch (error: any) {
    if (error.message === 'TOKEN_INVALID') return errorResponse(ErrorCodes.TOKEN_INVALID, 'Token de refresco inválido o expirado', null, 401);
    if (error.message === 'USER_INACTIVE') return errorResponse(ErrorCodes.USER_INACTIVE, 'Cuenta desactivada', null, 403);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', null, 500);
  }
}
