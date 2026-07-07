import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, AccessTokenPayload } from './jwt';
import { errorResponse, ErrorCodes } from '../utils/api-response';
import { checkRateLimit } from '../security/rate-limiter';

export interface AuthenticatedRequest extends NextRequest {
  user: AccessTokenPayload;
}

type HandlerFn = (req: any, context: any) => Promise<NextResponse>;

/**
 * Obtener IP del cliente de forma segura
 */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '127.0.0.1';
}

export function withAuth(
  handler: HandlerFn,
  options: { roles?: string[]; optional?: boolean; require2fa?: boolean } = {}
): HandlerFn {
  return async (req: NextRequest, context: any) => {
    try {
      const clientIp = getClientIp(req);
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

      // 1. Resolver autenticación
      let payload: AccessTokenPayload | null = null;
      if (token) {
        payload = verifyAccessToken(token);
      }

      // 2. Aplicar Rate Limiting Shield
      const limitKey = payload ? `usr:${payload.userId}` : `ip:${clientIp}`;
      const limitVal = payload ? 1000 : 100; // 1000 para autenticados, 100 para anónimos
      const windowMs = 15 * 60 * 1000; // Ventana de 15 minutos

      const rateCheck = checkRateLimit(limitKey, limitVal, windowMs);
      if (!rateCheck.success) {
        return errorResponse(ErrorCodes.RATE_LIMITED, 'Demasiadas solicitudes. Inténtalo más tarde.', null, 429);
      }

      // 3. Validar accesos privados
      if (!payload && !options.optional) {
        return errorResponse(ErrorCodes.UNAUTHORIZED, 'Token de acceso requerido', null, 401);
      }

      if (payload) {
        const isAdmin = ['admin', 'clinic_admin', 'pharmacy_admin'].includes(payload.role);
        if ((options.require2fa || isAdmin) && !payload.is2faVerified) {
          return errorResponse(ErrorCodes.TWO_FACTOR_REQUIRED, 'Se requiere verificación 2FA', null, 403);
        }

        if (options.roles?.length && !options.roles.includes(payload.role)) {
          return errorResponse(ErrorCodes.FORBIDDEN, 'No tienes permisos para esta acción', null, 403);
        }

        (req as AuthenticatedRequest).user = payload;
      }

      // 4. Ejecutar controlador con Rate Limit y Error Handler inyectados
      const response = await handler(req as AuthenticatedRequest, context);

      // Inyectar cabeceras RateLimit estándar
      response.headers.set('X-RateLimit-Limit', String(rateCheck.limit));
      response.headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateCheck.resetTime / 1000)));

      return response;
    } catch (error: any) {
      console.error('Error global capturado en middleware:', error);
      // Evitar fugas de detalles del servidor en producción
      const message = process.env.NODE_ENV === 'production' 
        ? 'Ha ocurrido un error interno en el servidor.' 
        : error.message || 'Error interno';
        
      return errorResponse(ErrorCodes.INTERNAL_ERROR, message, null, 500);
    }
  };
}

/**
 * Wrapper HOC para rutas públicas que solo requieren Rate Limiting
 */
export function withPublicRateLimit(handler: HandlerFn, customLimit?: number): HandlerFn {
  return async (req: NextRequest, context: any) => {
    try {
      const clientIp = getClientIp(req);
      const limitKey = `pub:${clientIp}`;
      const limitVal = customLimit || 100; // Límite por defecto de 100 req

      const rateCheck = checkRateLimit(limitKey, limitVal, 15 * 60 * 1000);
      if (!rateCheck.success) {
        return errorResponse(ErrorCodes.RATE_LIMITED, 'Demasiadas solicitudes. Inténtalo más tarde.', null, 429);
      }

      const response = await handler(req, context);
      response.headers.set('X-RateLimit-Limit', String(rateCheck.limit));
      response.headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateCheck.resetTime / 1000)));
      return response;
    } catch (error: any) {
      console.error('Error global capturado en ruta pública:', error);
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error interno del servidor', null, 500);
    }
  };
}

export const getUserFromRequest = (req: NextRequest) => (req as AuthenticatedRequest).user || null;
