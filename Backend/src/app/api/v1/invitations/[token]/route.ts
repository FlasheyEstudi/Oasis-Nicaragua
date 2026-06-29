import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import * as invitationService from '@/lib/services/invitation.service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const invitation = await invitationService.getInvitationByToken(token);
    return successResponse(invitation, 'Invitación válida');
  } catch (error: any) {
    if (error.message === 'INVITATION_NOT_FOUND') return errorResponse(ErrorCodes.NOT_FOUND, 'Invitación no encontrada o token inválido', null, 404);
    if (error.message === 'INVITATION_ALREADY_ACCEPTED') return errorResponse(ErrorCodes.CONFLICT, 'Esta invitación ya fue aceptada previamente', null, 409);
    if (error.message === 'INVITATION_EXPIRED') return errorResponse(ErrorCodes.TOKEN_EXPIRED, 'Esta invitación ha expirado tras el límite de 7 días', null, 410);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error del servidor', null, 500);
  }
}
