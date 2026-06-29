import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/utils/api-response';
import { reversePhoton } from '@/lib/map/photon';

const cache = new Map<string, { address: string; expiry: number }>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    
    if (!latStr || !lngStr) {
      return errorResponse(ErrorCodes.BAD_REQUEST, 'Parámetros latitud (lat) y longitud (lng) requeridos', null, 400);
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    
    if (isNaN(lat) || isNaN(lng)) {
      return errorResponse(ErrorCodes.BAD_REQUEST, 'Valores de coordenadas inválidos', null, 400);
    }

    // Normalizamos coordenadas a 5 decimales (~1.1 metros de precisión) para optimizar el golpe de caché
    const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();
    
    if (cached && cached.expiry > now) {
      return successResponse({ address: cached.address });
    }

    const address = await reversePhoton(lat, lng);
    
    if (cache.size > 2000) {
      for (const [key, val] of cache.entries()) {
        if (val.expiry <= now) cache.delete(key);
      }
    }

    cache.set(cacheKey, { address, expiry: now + CACHE_TTL_MS });
    return successResponse({ address });
  } catch (error: any) {
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Error al realizar reverse geocoding', null, 500);
  }
}
