import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody } from '@/lib/validators';
import { z } from 'zod';
import * as invitationService from '@/lib/services/invitation.service';

const inviteCashierSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
});

export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const validation = validateBody(inviteCashierSchema, body);
    if (!validation.success) return validation.error;

    if (body.name) {
      // Creación directa
      const employee = await invitationService.createEmployeeDirectly(
        req.user.userId,
        {
          name: body.name,
          email: body.email,
          phone: body.phone,
          password: body.password,
          role: 'cashier',
          pharmacyId: id,
        },
        req.headers.get('x-forwarded-for') || undefined,
        req.headers.get('user-agent') || undefined
      );
      return successResponse(employee, 'Cajero creado y vinculado exitosamente', 201);
    }

    // Invitación clásica
    const invitation = await invitationService.inviteWorker(
      req.user.userId,
      body.email,
      'cashier',
      undefined,
      id,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );
    return successResponse(invitation, 'Invitación para cajero creada exitosamente', 201);
  } catch (error: any) {
    if (error.message === 'EMAIL_ALREADY_REGISTERED' || error.message === 'EMAIL_EXISTS') {
      return errorResponse(ErrorCodes.CONFLICT, 'El correo ya está registrado en el sistema', null, 409);
    }
    if (error.message === 'FORBIDDEN_PHARMACY') {
      return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes permisos sobre esta farmacia', null, 403);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error del servidor', null, 500);
  }
}, { roles: ['pharmacy_admin', 'admin'] });
