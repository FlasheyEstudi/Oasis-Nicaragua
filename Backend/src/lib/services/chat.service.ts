// OASIS - Chat Service
// Core logic for real-time messaging between patients, doctors, and couriers

import { db } from '../db';

/**
 * Obtener todas las sesiones de chat de un usuario
 */
export async function getChatSessions(userId: string) {
  return db.chatSession.findMany({
    where: {
      participants: {
        some: { userId }
      },
      isActive: true
    },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, name: true, role: true, fcmToken: true }
          }
        }
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: { updatedAt: 'desc' }
  });
}

/**
 * Obtener mensajes paginados de una sesión de chat
 */
export async function getChatMessages(sessionId: string, userId: string, limit: number, skip: number) {
  // Verificar que el usuario pertenece a la sesión
  const isParticipant = await db.chatParticipant.findFirst({
    where: { sessionId, userId }
  });
  if (!isParticipant) {
    throw new Error('FORBIDDEN: No tienes acceso a esta sesión de chat.');
  }

  const [data, total] = await Promise.all([
    db.chatMessage.findMany({
      where: { sessionId },
      include: {
        sender: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    db.chatMessage.count({ where: { sessionId } })
  ]);

  return { data: data.reverse(), total };
}

/**
 * Crear o recuperar una sesión de chat directo entre dos usuarios
 */
export async function createChatSession(
  creatorId: string,
  recipientId: string,
  type: string,
  targetId?: string
) {
  if (creatorId === recipientId) {
    throw new Error('VALIDATION_ERROR: No puedes iniciar un chat contigo mismo.');
  }

  // Buscar si ya existe una sesión activa del mismo tipo con los mismos participantes
  const existingSession = await db.chatSession.findFirst({
    where: {
      type,
      targetId: targetId || null,
      isActive: true,
      AND: [
        { participants: { some: { userId: creatorId } } },
        { participants: { some: { userId: recipientId } } }
      ]
    },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, name: true, role: true }
          }
        }
      }
    }
  });

  if (existingSession) return existingSession;

  // Si no existe, crear la sesión transaccionalmente
  return await db.$transaction(async (tx) => {
    const session = await tx.chatSession.create({
      data: {
        type,
        targetId: targetId || null,
        isActive: true
      }
    });

    await tx.chatParticipant.createMany({
      data: [
        { sessionId: session.id, userId: creatorId },
        { sessionId: session.id, userId: recipientId }
      ]
    });

    return tx.chatSession.findUnique({
      where: { id: session.id },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, role: true }
            }
          }
        }
      }
    });
  });
}

/**
 * Registrar un nuevo mensaje en la sesión de chat
 */
export async function createChatMessage(sessionId: string, senderId: string, content: string) {
  // Verificar participación activa
  const isParticipant = await db.chatParticipant.findFirst({
    where: { sessionId, userId: senderId }
  });
  if (!isParticipant) {
    throw new Error('FORBIDDEN: No tienes permiso para enviar mensajes en este chat.');
  }

  return await db.$transaction(async (tx) => {
    // 1. Crear el mensaje
    const message = await tx.chatMessage.create({
      data: {
        sessionId,
        senderId,
        content,
        isRead: false
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    // 2. Actualizar marca de tiempo de la sesión
    await tx.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    });

    return message;
  });
}

/**
 * Marcar todos los mensajes recibidos de una sesión como leídos
 */
export async function markMessagesAsRead(sessionId: string, readerId: string) {
  return db.chatMessage.updateMany({
    where: {
      sessionId,
      senderId: { not: readerId },
      isRead: false
    },
    data: { isRead: true }
  });
}
