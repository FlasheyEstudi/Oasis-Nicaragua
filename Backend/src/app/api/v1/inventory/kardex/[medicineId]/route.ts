import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import * as inventoryService from '@/lib/services/inventory.service';

export const GET = withAuth(async (req: AuthenticatedRequest, context: { params: Promise<{ medicineId: string }> }) => {
  try {
    const { medicineId } = await context.params;
    const { searchParams } = new URL(req.url);
    const pharmacyId = searchParams.get('pharmacy_id') || undefined;

    const kardex = await inventoryService.getKardex(medicineId, pharmacyId);
    return successResponse(kardex, 'Movimientos de Kardex cargados exitosamente');
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error del servidor', null, 500);
  }
}, { roles: ['pharmacy_manager', 'admin'] });
