// OASIS - Mark Notifications Read API Route
// POST /api/v1/notifications/mark-read - Mark one or all notifications as read

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import * as notificationService from '@/lib/services/notification.service';
import { z } from 'zod';

const markReadSchema = z.object({
  id: z.string().optional()
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json().catch(() => ({}));
    const validation = markReadSchema.safeParse(body);
    const { userId } = req.user;

    if (validation.success && validation.data.id) {
      await notificationService.markNotificationAsRead(validation.data.id, userId);
      return successResponse(null, 'Notificación marcada como leída');
    } else {
      await notificationService.markAllNotificationsAsRead(userId);
      return successResponse(null, 'Todas las notificaciones marcadas como leídas');
    }
  } catch (error: any) {
    if (error.message.includes('NOT_FOUND')) {
      return errorResponse(ErrorCodes.NOT_FOUND, error.message, null, 404);
    }
    if (error.message.includes('FORBIDDEN')) {
      return errorResponse(ErrorCodes.FORBIDDEN, error.message, null, 403);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
});
