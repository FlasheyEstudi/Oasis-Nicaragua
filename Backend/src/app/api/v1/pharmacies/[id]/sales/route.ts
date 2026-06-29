// OASIS - Pharmacy Sales Route
// POST /api/v1/pharmacies/:id/sales

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, createSaleSchema } from '@/lib/validators';
import * as saleService from '@/lib/services/sale.service';
import { verifyFacilityAccess } from '@/lib/auth/access';

export const POST = withAuth(async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: pharmacyId } = await context.params;

    if (req.user.role !== 'patient') {
      const hasAccess = await verifyFacilityAccess(req.user.userId, req.user.role, pharmacyId, 'pharmacy');
      if (!hasAccess) {
        return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes acceso a esta farmacia', 403);
      }
    }

    const body = await req.json();
    const validation = validateBody(createSaleSchema, body);
    if (!validation.success) return validation.error;

    const creatorId = req.user.userId;
    const patientId = body.patient_id || (req.user.role === 'patient' ? req.user.userId : undefined);

    const data = await saleService.createSale(
      pharmacyId,
      validation.data as any,
      patientId,
      creatorId,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return successResponse(data, 'Venta creada exitosamente', 201);
  } catch (error: any) {
    console.error('❌ [Pharmacy Sale API Error]:', error);
    if (error.message?.startsWith('INSUFFICIENT_STOCK')) {
      return errorResponse(ErrorCodes.INSUFFICIENT_STOCK, 'Stock insuficiente', 400);
    }
    if (error.message === 'INSUFFICIENT_PAYMENT') {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'El monto total de los pagos no cubre el total de la venta', 400);
    }
    if (error.message === 'NOT_FOUND') {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Farmacia no encontrada', 404);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, `Error interno del servidor: ${error.message || error}`, 500);
  }
}, { roles: ['patient', 'pharmacy_manager', 'pharmacy_admin', 'admin', 'cashier'] });
