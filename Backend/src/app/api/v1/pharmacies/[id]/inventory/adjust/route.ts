import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, adjustInventorySchema } from '@/lib/validators';
import * as inventoryService from '@/lib/services/inventory.service';
import { verifyFacilityAccess } from '@/lib/auth/access';

export const POST = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;

      const hasAccess = await verifyFacilityAccess(req.user.userId, req.user.role, id, 'pharmacy');
      if (!hasAccess) return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes acceso a esta farmacia', null, 403);

      const body = await req.json();
      const validation = validateBody(adjustInventorySchema, body);
      if (!validation.success) return validation.error;

      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
      const userAgent = req.headers.get('user-agent') || undefined;

      const result = await inventoryService.adjustInventory(
        id,
        validation.data,
        req.user.userId,
        ipAddress,
        userAgent
      );

      return successResponse(result, 'Inventario ajustado exitosamente');
    } catch (error: any) {
      if (error.message === 'INSUFFICIENT_STOCK') {
        return errorResponse(ErrorCodes.INSUFFICIENT_STOCK, 'Stock insuficiente', null, 400);
      }
      return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
    }
  },
  { roles: ['pharmacy_manager', 'pharmacy_admin', 'admin'] }
);
