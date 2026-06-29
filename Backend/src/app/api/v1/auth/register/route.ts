import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, registerSchema } from '@/lib/validators';
import { registerUser } from '@/lib/services/user-registration.service';
import { hashPassword } from '@/lib/auth/password';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(registerSchema, body);
    if (!validation.success) return validation.error;

    // Hashear contraseña
    const passwordHash = await hashPassword(body.password);

    const result = await registerUser(
      { ...body, passwordHash },
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    const { refresh_token, ...data } = result;
    const response = successResponse(data, 'Registro de usuario exitoso', 211); // 211 como indica el protocolo
    
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
    if (error.message === 'EMAIL_EXISTS') return errorResponse(ErrorCodes.EMAIL_EXISTS, 'El correo electrónico ya está registrado', null, 400);
    if (error.message === 'ADMIN_NOT_ALLOWED') return errorResponse(ErrorCodes.FORBIDDEN, 'Token de invitación requerido para registrar administradores', null, 403);
    if (error.message === 'INVALID_INVITATION_TOKEN') return errorResponse(ErrorCodes.FORBIDDEN, 'Token de invitación inválido o vencido', null, 403);
    if (error.message === 'CANNOT_CLAIM_EXISTING_ENTITY_WITHOUT_INVITATION') return errorResponse(ErrorCodes.FORBIDDEN, 'No se puede asociar a un establecimiento existente sin token de invitación', null, 403);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', null, 500);
  }
}
