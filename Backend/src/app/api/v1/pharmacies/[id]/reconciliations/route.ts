// OASIS - Pharmacy Cash Reconciliations Route
// GET /api/v1/pharmacies/[id]/reconciliations - List settlement history
// POST /api/v1/pharmacies/[id]/reconciliations - Submit a cash drawer balance/settle

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

    const history = await cashReconciliationService.getReconciliationHistory(pharmacyId, 'pharmacy');
    return successResponse(history);
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error al obtener historial de arqueos', 500);
  }
}, { roles: ['pharmacy_admin', 'pharmacy_manager', 'admin', 'cashier'] });

export const POST = withAuth(async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: pharmacyId } = await context.params;
    if (!pharmacyId) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'ID de farmacia requerido', 400);
    }

    const hasAccess = await verifyFacilityAccess(req.user.userId, req.user.role, pharmacyId, 'pharmacy');
    if (!hasAccess) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes acceso a esta farmacia', 403);
    }

    const body = await req.json();
    const { openingBalance, actualCash, actualCard, notes } = body;

    if (openingBalance === undefined || actualCash === undefined || actualCard === undefined) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Balances de apertura, efectivo real y tarjeta real son obligatorios',
        400
      );
    }

    const parsedOpening = parseFloat(openingBalance);
    const parsedCash = parseFloat(actualCash);
    const parsedCard = parseFloat(actualCard);

    if (isNaN(parsedOpening) || isNaN(parsedCash) || isNaN(parsedCard)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Balances de apertura, efectivo real y tarjeta real deben ser números válidos',
        400
      );
    }

    const settle = await cashReconciliationService.createCashReconciliation(
      req.user.userId,
      {
        entityId: pharmacyId,
        entityType: 'pharmacy',
        openingBalance: parsedOpening,
        actualCash: parsedCash,
        actualCard: parsedCard,
        notes: notes || '',
      },
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return successResponse(settle, 'Arqueo de caja guardado exitosamente y registrado en bitácora inmutable', 201);
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error al guardar el arqueo de caja', 500);
  }
}, { roles: ['pharmacy_admin', 'pharmacy_manager', 'admin', 'cashier'] });
