import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody } from '@/lib/validators';
import { z } from 'zod';
import * as invitationService from '@/lib/services/invitation.service';

const acceptInvitationSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await req.json();
    const validation = validateBody(acceptInvitationSchema, body);
    if (!validation.success) return validation.error;

    const worker = await invitationService.acceptInvitation(
      token,
      body.name,
      body.password,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return successResponse(worker, 'Cuenta de trabajador creada y activada exitosamente', 201);
  } catch (error: any) {
    if (error.message === 'INVITATION_NOT_FOUND') return errorResponse(ErrorCodes.NOT_FOUND, 'Invitación no encontrada o token inválido', null, 404);
    if (error.message === 'INVITATION_ALREADY_ACCEPTED') return errorResponse(ErrorCodes.CONFLICT, 'Esta invitación ya fue aceptada previamente', null, 409);
    if (error.message === 'INVITATION_EXPIRED') return errorResponse(ErrorCodes.TOKEN_EXPIRED, 'Esta invitación ha expirado', null, 410);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error del servidor', null, 500);
  }
}
