// OASIS - Delivery List API Route
// GET /api/v1/delivery - List deliveries with role-based boundaries

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/utils/api-response';
import { parsePagination } from '@/lib/utils/pagination';
import * as deliveryService from '@/lib/services/delivery.service';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const { userId, role } = req.user;

    const filters: any = { limit, skip };

    // Delimitar accesos por rol
    if (role === 'delivery_driver') {
      filters.driverId = userId;
    } else if (role === 'patient') {
      filters.patientId = userId;
    } else if (role === 'pharmacy_manager' || role === 'cashier') {
      const { db } = await import('@/lib/db');
      const profile = await db.pharmacyManagerProfile.findUnique({
        where: { userId },
        select: { pharmacyId: true }
      });
      filters.pharmacyId = profile?.pharmacyId || 'none';
    } else if (role === 'pharmacy_admin') {
      const { db } = await import('@/lib/db');
      const pharmacy = await db.pharmacy.findFirst({
        where: { ownerId: userId },
        select: { id: true }
      });
      filters.pharmacyId = pharmacy?.id || 'none';
    } else if (role !== 'admin') {
      return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes permiso para ver entregas', 403);
    }

    // Filtro opcional por estado
    const status = searchParams.get('status');
    if (status) filters.status = status;

    const result = await deliveryService.getDeliveries(filters);
    return paginatedResponse(result.data, page, limit, result.total);
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
}, { roles: ['admin', 'pharmacy_admin', 'pharmacy_manager', 'delivery_driver', 'patient'] });
