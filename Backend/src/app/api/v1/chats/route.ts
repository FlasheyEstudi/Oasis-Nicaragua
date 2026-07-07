// OASIS - Chat Sessions API Route
// GET /api/v1/chats - List user chat sessions
// POST /api/v1/chats - Create or retrieve a direct chat session

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, createChatSchema } from '@/lib/validators';
import * as chatService from '@/lib/services/chat.service';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { userId } = req.user;
    const sessions = await chatService.getChatSessions(userId);
    return successResponse(sessions, 'Sesiones de chat obtenidas con éxito');
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const validation = validateBody(createChatSchema, body);
    if (!validation.success) return validation.error;

    const { recipient_id, type, target_id } = validation.data;
    const creatorId = req.user.userId;

    const session = await chatService.createChatSession(creatorId, recipient_id, type, target_id);
    return successResponse(session, 'Sesión de chat establecida con éxito', 201);
  } catch (error: any) {
    if (error.message.includes('VALIDATION_ERROR')) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, error.message, null, 400);
    }
    return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
  }
});
