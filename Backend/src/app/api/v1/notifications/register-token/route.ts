// OASIS - Register FCM Token API Route
// POST /api/v1/notifications/register-token - Register an FCM push token for a user

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, registerFCMTokenSchema } from '@/lib/validators';
import * as notificationService from '@/lib/services/notification.service';

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const validation = validateBody(registerFCMTokenSchema, body);
    if (!validation.success) return validation.error;

    const { token } = validation.data;
    const { userId } = req.user;

    await notificationService.registerFCMToken(userId, token);
    return successResponse(null, 'Token FCM registrado con éxito');
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
});
