// OASIS - Appointments List & Create Route
// GET /api/v1/appointments - List appointments (role-based)
// POST /api/v1/appointments - Create appointment

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, createAppointmentSchema } from '@/lib/validators';
import { parsePagination } from '@/lib/utils/pagination';
import * as appointmentService from '@/lib/services/appointment.service';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const { userId, role: userRole } = req.user;

    const result = await appointmentService.getAppointments({
      patientId: searchParams.get('patient_id') || undefined,
      doctorId: searchParams.get('doctor_id') || undefined,
      clinicId: searchParams.get('clinic_id') || undefined,
      status: searchParams.get('status') || undefined,
      dateFrom: searchParams.get('date_from') || undefined,
      dateTo: searchParams.get('date_to') || undefined,
      userRole,
      userId,
      limit,
      skip,
    });

    return paginatedResponse(result.data, page, limit, result.total);
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', 500);
  }
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const validation = validateBody(createAppointmentSchema, body);
    if (!validation.success) return validation.error;

    let patientId = req.user.userId;
    if (req.user.role !== 'patient') {
      if (!body.patient_id) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, 'ID de paciente requerido', 400);
      }
      patientId = body.patient_id;

      // Access verification for staff
      if (req.user.role === 'receptionist' || req.user.role === 'doctor' || req.user.role === 'clinic_admin') {
        const { verifyFacilityAccess } = await import('@/lib/auth/access');
        const hasAccess = await verifyFacilityAccess(req.user.userId, req.user.role, body.clinic_id, 'clinic');
        if (!hasAccess) {
          return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes permiso para crear citas en esta clínica', 403);
        }
      }
    }

    const appointment = await appointmentService.createAppointment(
      {
        doctor_id: body.doctor_id,
        clinic_id: body.clinic_id,
        date_time: body.date_time,
        duration_minutes: body.duration_minutes,
        notes: body.notes,
        patientId,
      },
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );

    return successResponse(appointment, 'Cita creada exitosamente', 201);
  } catch (error: any) {
    if (error.message.includes('CONFLICT')) {
      return errorResponse(ErrorCodes.CONFLICT, error.message, 409);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', 500);
  }
}, { roles: ['patient', 'doctor', 'receptionist', 'admin'] });
