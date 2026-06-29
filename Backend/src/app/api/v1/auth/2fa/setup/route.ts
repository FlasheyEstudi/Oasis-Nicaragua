import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import * as authService from '@/lib/services/auth.service';

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const data = await authService.setup2FA(req.user.userId);
    return successResponse(data, 'Configuración 2FA inicializada. Escanee el código QR para activar.');
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error al configurar 2FA', null, 500);
  }
});
