import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import * as inventoryService from '@/lib/services/inventory.service';
import { verifyFacilityAccess } from '@/lib/auth/access';

export const GET = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;

      const hasAccess = await verifyFacilityAccess(req.user.userId, req.user.role, id, 'pharmacy');
      if (!hasAccess) return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes acceso a esta farmacia', null, 403);

      const batches = await inventoryService.getExpiringBatches(id);
      return successResponse(batches);
    } catch (error: any) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', null, 500);
    }
  },
  { roles: ['pharmacy_manager', 'pharmacy_admin', 'admin'] }
);
