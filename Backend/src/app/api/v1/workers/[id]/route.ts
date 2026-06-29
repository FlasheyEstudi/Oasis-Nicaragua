import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody } from '@/lib/validators';
import { z } from 'zod';
import * as invitationService from '@/lib/services/invitation.service';

const updateWorkerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(),
  vehicleType: z.string().optional(),
  licensePlate: z.string().optional(),
});

export const PUT = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const validation = validateBody(updateWorkerSchema, body);
    if (!validation.success) return validation.error;

    const worker = await invitationService.updateWorkerDetails(
      id,
      req.user.userId,
      body,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return successResponse(worker, 'Datos del trabajador actualizados exitosamente');
  } catch (error: any) {
    if (error.message === 'WORKER_NOT_FOUND') return errorResponse(ErrorCodes.NOT_FOUND, 'Trabajador no encontrado', null, 404);
    if (error.message === 'FORBIDDEN') return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes permisos para modificar este trabajador (Anti-Spoofing)', null, 403);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error del servidor', null, 500);
  }
}, { roles: ['clinic_admin', 'pharmacy_admin', 'admin'] });
