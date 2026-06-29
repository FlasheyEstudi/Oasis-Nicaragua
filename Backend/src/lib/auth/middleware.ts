import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, AccessTokenPayload } from './jwt';
import { errorResponse, ErrorCodes } from '../utils/api-response';

export interface AuthenticatedRequest extends NextRequest {
  user: AccessTokenPayload;
}

type HandlerFn = (req: any, context: any) => Promise<NextResponse>;

export function withAuth(handler: HandlerFn, options: { roles?: string[]; optional?: boolean; require2fa?: boolean } = {}): HandlerFn {
  return async (req: NextRequest, context: any) => {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return options.optional ? handler(req, context) : errorResponse(ErrorCodes.UNAUTHORIZED, 'Token de acceso requerido', null, 401);
    }

    const payload = verifyAccessToken(token);
    if (!payload) return errorResponse(ErrorCodes.TOKEN_INVALID, 'Token inválido o expirado', null, 401);

    const isAdmin = ['admin', 'clinic_admin', 'pharmacy_admin'].includes(payload.role);
    if ((options.require2fa || isAdmin) && !payload.is2faVerified) {
      return errorResponse(ErrorCodes.TWO_FACTOR_REQUIRED, 'Se requiere verificación 2FA', null, 403);
    }

    if (options.roles?.length && !options.roles.includes(payload.role)) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes permisos para esta acción', null, 403);
    }

    (req as AuthenticatedRequest).user = payload;
    return handler(req as AuthenticatedRequest, context);
  };
}

export const getUserFromRequest = (req: NextRequest) => (req as AuthenticatedRequest).user || null;
