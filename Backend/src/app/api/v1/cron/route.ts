// OASIS - Scheduled Cron Job Trigger Route
// GET /api/v1/cron - Runs background checks (medication reminders)
// Protected via query parameter or header with CRON_SECRET token

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { triggerScheduledReminders } from '@/lib/services/reminder.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret') || req.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET || 'oasis_cron_super_secret_token_123';

    if (secret !== expectedSecret) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'No autorizado para ejecutar tareas cron', 401);
    }

    // Ejecutar recordatorios de medicamentos activos de la hora actual
    const reminderResult = await triggerScheduledReminders();

    return successResponse(
      { 
        processed: true, 
        reminders: reminderResult 
      },
      'Tareas programadas de recordatorios ejecutadas exitosamente.'
    );
  } catch (error: any) {
    console.error('Error al ejecutar cron:', error);
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno al ejecutar tareas cron', null, 500);
  }
}
