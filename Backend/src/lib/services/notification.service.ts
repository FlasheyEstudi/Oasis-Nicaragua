// OASIS - Notification Service
// Push and database notification management with automatic FCM token cleanup

import { db } from '../db';
import { app } from '../firebase';

/**
 * Obtener notificaciones paginadas de un usuario
 */
export async function getNotifications(userId: string, limit: number, skip: number) {
  const [data, total] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    db.notification.count({ where: { userId } })
  ]);
  return { data, total };
}

/**
 * Marcar una notificación específica como leída
 */
export async function markNotificationAsRead(id: string, userId: string) {
  const notification = await db.notification.findUnique({ where: { id } });
  if (!notification) throw new Error('NOT_FOUND: Notificación no encontrada.');
  if (notification.userId !== userId) throw new Error('FORBIDDEN: Acceso no autorizado.');

  return db.notification.update({
    where: { id },
    data: { isRead: true }
  });
}

/**
 * Marcar todas las notificaciones de un usuario como leídas
 */
export async function markAllNotificationsAsRead(userId: string) {
  return db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });
}

/**
 * Registrar token FCM para push notifications
 */
export async function registerFCMToken(userId: string, token: string) {
  return db.user.update({
    where: { id: userId },
    data: { fcmToken: token }
  });
}

/**
 * Remover token FCM (cierre de sesión)
 */
export async function unregisterFCMToken(userId: string) {
  return db.user.update({
    where: { id: userId },
    data: { fcmToken: null }
  });
}

/**
 * Crear notificación en BD e intentar enviarla vía FCM
 * Con auto-limpieza inteligente de tokens inválidos
 */
export async function sendNotification(
  userId: string,
  data: { title: string; body: string; type: string; link?: string }
) {
  // 1. Crear el registro en la Base de Datos
  const notification = await db.notification.create({
    data: {
      userId,
      title: data.title,
      body: data.body,
      type: data.type,
      link: data.link || null,
      isRead: false
    }
  });

  // 2. Obtener el token FCM del usuario
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true }
  });

  if (!user || !user.fcmToken || !app) {
    return notification;
  }

  // 3. Intentar envío Push vía Firebase
  try {
    const { admin } = await import('../firebase');
    await admin.messaging().send({
      token: user.fcmToken,
      notification: {
        title: data.title,
        body: data.body
      },
      data: {
        type: data.type,
        link: data.link || '',
        notificationId: notification.id
      }
    });
  } catch (error: any) {
    console.error(`Fallo en el envío FCM para el usuario ${userId}:`, error);

    // Listado de códigos de error de Firebase para tokens inválidos/vencidos
    const invalidTokenErrorCodes = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
      'messaging/invalid-argument'
    ];

    const isInvalidToken = 
      invalidTokenErrorCodes.includes(error.code) || 
      error.message?.includes('registration-token-not-registered') ||
      error.message?.includes('invalid-registration-token');

    if (isInvalidToken) {
      console.warn(`Limpieza automática: Removiendo token FCM inválido para el usuario ${userId}`);
      await db.user.update({
        where: { id: userId },
        data: { fcmToken: null }
      });
    }
  }

  return notification;
}
