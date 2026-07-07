// OASIS - List Notifications API Route
// GET /api/v1/notifications - Get paginated list of user notifications

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/utils/api-response';
import { parsePagination } from '@/lib/utils/pagination';
import * as notificationService from '@/lib/services/notification.service';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { userId } = req.user;
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const result = await notificationService.getNotifications(userId, limit, skip);
    return paginatedResponse(result.data, page, limit, result.total);
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
});
