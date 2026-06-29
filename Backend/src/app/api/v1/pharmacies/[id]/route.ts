import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, updatePharmacySchema } from '@/lib/validators';
import * as pharmacyService from '@/lib/services/pharmacy.service';
import { verifyFacilityAccess } from '@/lib/auth/access';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const pharmacy = await pharmacyService.getPharmacy(id);
    return successResponse(pharmacy);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return errorResponse(ErrorCodes.NOT_FOUND, 'Farmacia no encontrada', null, 404);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', null, 500);
  }
}

export const PATCH = withAuth(async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validation = validateBody(updatePharmacySchema, body);
    if (!validation.success) return validation.error;

    if (req.user.role !== 'admin') {
      const hasAccess = await verifyFacilityAccess(req.user.userId, req.user.role, id, 'pharmacy');
      if (!hasAccess) return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes permiso para actualizar esta farmacia', null, 403);
    }

    const updated = await pharmacyService.updatePharmacy(
      id,
      validation.data,
      req.user.userId,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return successResponse(updated, 'Farmacia actualizada exitosamente');
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return errorResponse(ErrorCodes.NOT_FOUND, 'Farmacia no encontrada', null, 404);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', null, 500);
  }
}, { roles: ['admin', 'pharmacy_admin'] });
