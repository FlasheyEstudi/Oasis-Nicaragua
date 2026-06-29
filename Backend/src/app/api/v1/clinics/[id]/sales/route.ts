// OASIS - Clinic Sales Route
// POST /api/v1/clinics/:id/sales

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, createSaleSchema } from '@/lib/validators';
import * as saleService from '@/lib/services/sale.service';
import { verifyFacilityAccess } from '@/lib/auth/access';

export const POST = withAuth(async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: clinicId } = await context.params;

    if (req.user.role !== 'patient') {
      const hasAccess = await verifyFacilityAccess(req.user.userId, req.user.role, clinicId, 'clinic');
      if (!hasAccess) {
        return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes acceso a esta clínica', 403);
      }
    }

    const body = await req.json();
    const validation = validateBody(createSaleSchema, body);
    if (!validation.success) return validation.error;

    const creatorId = req.user.userId;
    const patientId = body.patient_id || (req.user.role === 'patient' ? req.user.userId : undefined);

    const data = await saleService.createSale(
      '', // pharmacyId is empty for clinic sales
      { ...(validation.data as any), clinic_id: clinicId },
      patientId,
      creatorId,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return successResponse(data, 'Factura de consulta creada exitosamente', 201);
  } catch (error: any) {
    console.error('❌ [Clinic Sale API Error]:', error);
    if (error.message === 'INSUFFICIENT_PAYMENT') {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'El monto total de los pagos no cubre el total de la venta', 400);
    }
    if (error.message === 'NOT_FOUND') {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Clínica no encontrada', 404);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, `Error interno del servidor: ${error.message || error}`, 500);
  }
}, { roles: ['patient', 'receptionist', 'clinic_admin', 'admin', 'doctor'] });
