import { RouteResponse, calculateHaversineFallback } from './osrm';

export interface LatLng {
  lat: number;
  lng: number;
}

export const multiRouteCache = new Map<string, RouteResponse>();

export function getMultiCacheKey(start: LatLng, end: LatLng, waypoints: LatLng[]): string {
  const round = (num: number) => num.toFixed(4);
  const ptStr = (p: LatLng) => `${round(p.lat)},${round(p.lng)}`;
  return [start, ...waypoints, end].map(ptStr).join('->');
}

/**
 * Selecciona la ruta más óptima evaluando el tráfico y la distancia con alternativas de OSRM
 */
export async function selectBestRoute(
  start: LatLng,
  end: LatLng,
  waypoints: LatLng[] = []
): Promise<RouteResponse> {
  const cacheKey = getMultiCacheKey(start, end, waypoints);
  if (multiRouteCache.has(cacheKey)) return multiRouteCache.get(cacheKey)!;

  const localUrl = process.env.OSRM_BASE_URL || 'http://osrm:5000';
  const fallbackUrlsStr = process.env.OSRM_FALLBACK_URLS || 'https://routing.openstreetmap.de/routed-car,https://router.project-osrm.org';
  const servers = [
    localUrl,
    ...fallbackUrlsStr.split(',').map((s) => s.trim()).filter(Boolean),
  ];

  const coords = [start, ...waypoints, end].map((p) => `${p.lng},${p.lat}`).join(';');
  const path = `/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=3&steps=true&annotations=true`;

  let responseData: any = null;

  for (const server of servers) {
    try {
      const res = await fetch(`${server}${path}`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json() as any;
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          responseData = data;
          break;
        }
      }
    } catch (err: any) {
      console.warn(`⚠️ [Route Selector] OSRM server ${server} falló:`, err.message || err);
    }
  }

  let result: RouteResponse;

  if (!responseData || !responseData.routes || responseData.routes.length === 0) {
    result = calculateHaversineFallback(start.lat, start.lng, end.lat, end.lng);
  } else {
    // Scoring: Pondera duración en tiempo + penalización ligera por exceso de kilómetros viales
    const scoredRoutes = responseData.routes.map((r: any) => {
      const score = r.duration + r.distance * 0.005; // 1 segundo equivale a 200m de desvío
      return { route: r, score };
    });

    scoredRoutes.sort((a: any, b: any) => a.score - b.score);
    const best = scoredRoutes[0].route;

    const routeCoords = best.geometry.coordinates.map((coord: [number, number]) => ({
      lat: coord[1],
      lng: coord[0],
    }));

    const distanceMeters = best.distance;
    const durationSeconds = best.duration;

    result = {
      route: routeCoords,
      distanceKm: distanceMeters / 1000,
      durationMinutes: Math.round(durationSeconds / 60),
      durationText: `${Math.round(durationSeconds / 60)} min`,
      distance_meters: distanceMeters,
      duration_seconds: durationSeconds,
      geometry: JSON.stringify(best.geometry),
    };
  }

  multiRouteCache.set(cacheKey, result);
  return result;
}
