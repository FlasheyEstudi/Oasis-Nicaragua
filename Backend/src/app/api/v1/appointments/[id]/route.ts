// OASIS - Appointment Detail Route
// GET /api/v1/appointments/:id - Details (owner or staff)
// PATCH /api/v1/appointments/:id - Reschedule

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import * as appointmentService from '@/lib/services/appointment.service';
import { verifyFacilityAccess } from '@/lib/auth/access';
import { db } from '@/lib/db';

export const GET = withAuth(async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await context.params;
    const appointment = await appointmentService.getAppointment(id);
    if (!appointment) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Cita no encontrada', 404);
    }

    const { userId, role: userRole } = req.user;
    let isAuthorized = false;

    if (userRole === 'admin' || appointment.patientId === userId || appointment.doctorId === userId) {
      isAuthorized = true;
    } else if (userRole === 'patient') {
      const caregiverRelation = await db.familyRelationship.findFirst({
        where: { caregiverId: userId, patientId: appointment.patientId, isActive: true, status: 'active' }
      });
      if (caregiverRelation) isAuthorized = true;
    } else if (userRole === 'clinic_admin' || userRole === 'receptionist' || userRole === 'doctor') {
      const isClinicStaff = await verifyFacilityAccess(userId, userRole, appointment.clinicId, 'clinic');
      if (isClinicStaff) isAuthorized = true;
    }

    if (!isAuthorized) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes acceso a esta cita', 403);
    }

    return successResponse(appointment);
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', 500);
  }
});

export const PATCH = withAuth(async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const updated = await appointmentService.updateAppointment(
      id,
      {
        date_time: body.date_time,
        duration_minutes: body.duration_minutes,
        notes: body.notes,
      },
      req.user.userId,
      req.user.role,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return successResponse(updated);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Cita no encontrada', 404);
    }
    if (error.message === 'UNAUTHORIZED') {
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'No tienes permiso para actualizar esta cita', 403);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error al actualizar la cita', 500);
  }
});
