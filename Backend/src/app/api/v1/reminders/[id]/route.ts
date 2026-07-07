// OASIS - Medication Reminder Detail API Route
// DELETE /api/v1/reminders/[id] - Remove a medication reminder

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import * as reminderService from '@/lib/services/reminder.service';

export const DELETE = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;
      const { userId } = req.user;

      await reminderService.deleteReminder(id, userId);
      return successResponse(null, 'Recordatorio eliminado con éxito');
    } catch (error: any) {
      if (error.message.includes('NOT_FOUND')) {
        return errorResponse(ErrorCodes.NOT_FOUND, error.message, null, 404);
      }
      if (error.message.includes('FORBIDDEN')) {
        return errorResponse(ErrorCodes.FORBIDDEN, error.message, null, 403);
      }
      return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
    }
  },
  { roles: ['patient', 'admin'] }
);
