// OASIS - Unregister FCM Token API Route
// POST /api/v1/notifications/unregister-token - Clear user FCM push token

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import * as notificationService from '@/lib/services/notification.service';

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { userId } = req.user;
    await notificationService.unregisterFCMToken(userId);
    return successResponse(null, 'Token FCM removido con éxito');
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
});
