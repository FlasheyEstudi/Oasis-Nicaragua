import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import * as invitationService from '@/lib/services/invitation.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const workers = await invitationService.getClinicWorkers(id, req.user.userId, req.user.role);
    return successResponse(workers, 'Personal de la clínica cargado correctamente');
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes permisos para ver el personal de esta clínica', null, 403);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
}, { roles: ['clinic_admin', 'admin'] });
