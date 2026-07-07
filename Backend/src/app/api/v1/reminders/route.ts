// OASIS - Medication Reminders API Route
// GET /api/v1/reminders - List user active medication reminders
// POST /api/v1/reminders - Create a medication reminder

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, createReminderSchema } from '@/lib/validators';
import * as reminderService from '@/lib/services/reminder.service';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { userId } = req.user;
    const reminders = await reminderService.getReminders(userId);
    return successResponse(reminders, 'Recordatorios obtenidos con éxito');
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
}, { roles: ['patient', 'admin'] });

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const validation = validateBody(createReminderSchema, body);
    if (!validation.success) return validation.error;

    const { prescription_line_id, medicine_name, dosage_instructions, scheduled_time } = validation.data;
    const { userId } = req.user;

    const reminder = await reminderService.createReminder(userId, {
      prescriptionLineId: prescription_line_id,
      medicineName: medicine_name,
      dosageInstructions: dosage_instructions,
      scheduledTime: scheduled_time
    });

    return successResponse(reminder, 'Recordatorio creado con éxito', 201);
  } catch (error: any) {
    if (error.message.includes('NOT_FOUND')) {
      return errorResponse(ErrorCodes.NOT_FOUND, error.message, null, 404);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
}, { roles: ['patient', 'admin'] });
