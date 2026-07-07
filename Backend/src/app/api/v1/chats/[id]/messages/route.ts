// OASIS - Chat Messages API Route
// GET /api/v1/chats/[id]/messages - Get paginated messages for a chat session
// POST /api/v1/chats/[id]/messages - Send a message in a chat session

import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, paginatedResponse, ErrorCodes } from '@/lib/utils/api-response';
import { validateBody, sendMessageSchema } from '@/lib/validators';
import { parsePagination } from '@/lib/utils/pagination';
import * as chatService from '@/lib/services/chat.service';

export const GET = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id: sessionId } = await context.params;
      const { userId } = req.user;
      const { searchParams } = new URL(req.url);
      const { page, limit, skip } = parsePagination(searchParams);

      const result = await chatService.getChatMessages(sessionId, userId, limit, skip);

      // Auto-marcar mensajes recibidos como leídos al abrir la conversación
      await chatService.markMessagesAsRead(sessionId, userId);

      return paginatedResponse(result.data, page, limit, result.total);
    } catch (error: any) {
      if (error.message.includes('FORBIDDEN')) {
        return errorResponse(ErrorCodes.FORBIDDEN, error.message, null, 403);
      }
      return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
    }
  }
);

export const POST = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id: sessionId } = await context.params;
      const { userId } = req.user;
      const body = await req.json();
      const validation = validateBody(sendMessageSchema, body);
      if (!validation.success) return validation.error;

      const { content } = validation.data;
      const message = await chatService.createChatMessage(sessionId, userId, content);

      return successResponse(message, 'Mensaje enviado con éxito', 201);
    } catch (error: any) {
      if (error.message.includes('FORBIDDEN')) {
        return errorResponse(ErrorCodes.FORBIDDEN, error.message, null, 403);
      }
      return errorResponse(ErrorCodes.INTERNAL_ERROR, error.message || 'Error interno del servidor', null, 500);
    }
  }
);
