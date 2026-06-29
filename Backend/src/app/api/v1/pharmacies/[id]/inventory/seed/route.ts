import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, seedInventorySchema } from '@/lib/validators';
import * as inventoryService from '@/lib/services/inventory.service';

export const POST = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;
      const body = await req.json();
      const validation = validateBody(seedInventorySchema, body);
      if (!validation.success) return validation.error;

      const result = await inventoryService.seedInventory(id, validation.data.items);
      return successResponse(result, 'Inventario sembrado exitosamente');
    } catch (error: any) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', null, 500);
    }
  },
  { roles: ['admin'] }
);
