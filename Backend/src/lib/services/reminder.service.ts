// OASIS - Medication Reminder Service
// Scheduling, listing, and processing medication reminders in batches

import { db } from '../db';
import { sendNotification } from './notification.service';

/**
 * Obtener todos los recordatorios activos de un usuario
 */
export async function getReminders(userId: string) {
  return db.medicationReminder.findMany({
    where: { userId },
    orderBy: { scheduledTime: 'asc' }
  });
}

/**
 * Crear un nuevo recordatorio de dosis
 */
export async function createReminder(
  userId: string,
  data: {
    prescriptionLineId: string;
    medicineName: string;
    dosageInstructions: string;
    scheduledTime: string;
  }
) {
  // Validar si existe la línea de receta
  const line = await db.prescriptionLine.findUnique({
    where: { id: data.prescriptionLineId }
  });
  if (!line) throw new Error('NOT_FOUND: Línea de receta no encontrada.');

  return db.medicationReminder.create({
    data: {
      userId,
      prescriptionLineId: data.prescriptionLineId,
      medicineName: data.medicineName,
      dosageInstructions: data.dosageInstructions,
      scheduledTime: data.scheduledTime,
      status: 'active'
    }
  });
}

/**
 * Eliminar un recordatorio
 */
export async function deleteReminder(id: string, userId: string) {
  const reminder = await db.medicationReminder.findUnique({ where: { id } });
  if (!reminder) throw new Error('NOT_FOUND: Recordatorio no encontrado.');
  if (reminder.userId !== userId) throw new Error('FORBIDDEN: Acceso no autorizado.');

  return db.medicationReminder.delete({ where: { id } });
}

/**
 * Disparador programado (Cron) para enviar notificaciones de dosis de la hora actual
 */
export async function triggerScheduledReminders() {
  const now = new Date();
  
  // Obtener hora local de Nicaragua en formato HH:MM (24h)
  // Nicaragua está en UTC-6
  const localTime = new Date(now.getTime() + (now.getTimezoneOffset() - 360) * 60 * 1000);
  const hours = String(localTime.getHours()).padStart(2, '0');
  const minutes = String(localTime.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;

  console.log(`[Reminders Cron] Ejecutando recordatorios para las: ${currentTimeStr}`);

  // 1. Obtener todos los recordatorios activos programados para este minuto exacto
  const reminders = await db.medicationReminder.findMany({
    where: {
      scheduledTime: currentTimeStr,
      status: 'active'
    },
    include: {
      user: {
        select: { id: true, name: true }
      }
    }
  });

  if (reminders.length === 0) {
    return { count: 0 };
  }

  // 2. Procesar en paralelo los envíos de notificaciones push y actualizaciones de estado
  const results = await Promise.all(
    reminders.map(async (reminder) => {
      try {
        // Enviar notificación push / campanita al paciente
        await sendNotification(reminder.userId, {
          title: '💊 Recordatorio de Medicamento',
          body: `Hola ${reminder.user.name}, es hora de tomar tu dosis de ${reminder.medicineName}. Instrucciones: ${reminder.dosageInstructions}`,
          type: 'medication_reminder',
          link: `/patient/prescriptions/${reminder.prescriptionLineId}`
        });

        // Actualizar marca de tiempo del último disparo
        await db.medicationReminder.update({
          where: { id: reminder.id },
          data: { lastNotified: new Date() }
        });

        return { id: reminder.id, success: true };
      } catch (err) {
        console.error(`Error procesando recordatorio ${reminder.id}:`, err);
        return { id: reminder.id, success: false };
      }
    })
  );

  const successfulCount = results.filter(r => r.success).length;
  console.log(`[Reminders Cron] Completado. Procesados: ${successfulCount}/${reminders.length}`);

  return { count: successfulCount, total: reminders.length };
}
