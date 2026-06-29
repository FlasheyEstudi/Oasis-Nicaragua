// OASIS - Pharmacy Cash Reconciliation Summary Route
// GET /api/v1/pharmacies/[id]/reconciliations/summary - Calculate system expected sales for reconciliation

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import * as cashReconciliationService from '@/lib/services/cash-reconciliation.service';
import { verifyFacilityAccess } from '@/lib/auth/access';

export const GET = withAuth(async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: pharmacyId } = await context.params;
    if (!pharmacyId) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'ID de farmacia requerido', 400);
    }

    const hasAccess = await verifyFacilityAccess(req.user.userId, req.user.role, pharmacyId, 'pharmacy');
    if (!hasAccess) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes acceso a esta farmacia', 403);
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || undefined;

    const summary = await cashReconciliationService.getCashSummary(pharmacyId, 'pharmacy', date);
    return successResponse(summary);
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error al calcular resumen de caja', 500);
  }
}, { roles: ['pharmacy_admin', 'pharmacy_manager', 'admin', 'cashier'] });
