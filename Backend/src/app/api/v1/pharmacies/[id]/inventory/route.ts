import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/utils/api-response';
import * as inventoryService from '@/lib/services/inventory.service';
import { parsePagination } from '@/lib/utils/pagination';
import { verifyFacilityAccess } from '@/lib/auth/access';

export const GET = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;

      if (!['patient', 'doctor'].includes(req.user.role)) {
        const hasAccess = await verifyFacilityAccess(req.user.userId, req.user.role, id, 'pharmacy');
        if (!hasAccess) return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes acceso a esta farmacia', null, 403);
      }

      const { searchParams } = new URL(req.url);
      const search = searchParams.get('search') || undefined;
      const lowStock = searchParams.get('low_stock') === 'true';
      const { page, limit, skip } = parsePagination(searchParams);

      const result = await inventoryService.getInventory({
        pharmacyId: id,
        search,
        lowStock,
        page,
        limit,
        skip,
      });

      return paginatedResponse(result.data, page, limit, result.total);
    } catch (error: any) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', null, 500);
    }
  },
  { roles: ['pharmacy_manager', 'pharmacy_admin', 'admin', 'patient', 'doctor', 'cashier', 'delivery_driver'] }
);
