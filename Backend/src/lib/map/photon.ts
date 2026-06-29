const PHOTON_URL = process.env.PHOTON_URL || 'https://photon.komoot.io';

export interface PhotonFeature {
  geometry: {
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    osm_value?: string;
  };
}

export interface PhotonResponse {
  features: PhotonFeature[];
}

export function formatPhotonName(p: PhotonFeature['properties']): string {
  const parts = [p.name, p.street, p.city, p.state, p.country].filter(Boolean);
  const uniqueParts: string[] = [];
  parts.forEach((part) => {
    if (part && !uniqueParts.includes(part)) {
      uniqueParts.push(part);
    }
  });
  return uniqueParts.join(', ');
}

export async function searchPhoton(query: string, limit = 8): Promise<any[]> {
  try {
    const url = `${PHOTON_URL}/api?q=${encodeURIComponent(query)}&limit=${limit}&lang=es&lat=12.1149&lon=-86.2362`;
    const res = await fetch(url, { 
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'OasisNicaraguaApp/2.0 (contact@oasisnicaragua.com)'
      }
    });
    if (!res.ok) throw new Error(`Photon API error: ${res.statusText}`);
    const data = (await res.json()) as PhotonResponse;
    return (data.features || []).map((f) => ({
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      display_name: formatPhotonName(f.properties),
      type: f.properties.osm_value || 'street',
    }));
  } catch (err) {
    console.error('⚠️ [Photon Geocoding] Search failed:', err);
    throw err;
  }
}

export async function reversePhoton(lat: number, lng: number): Promise<string> {
  try {
    const url = `${PHOTON_URL}/reverse?lon=${lng}&lat=${lat}&lang=es`;
    const res = await fetch(url, { 
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'OasisNicaraguaApp/2.0 (contact@oasisnicaragua.com)'
      }
    });
    if (!res.ok) throw new Error(`Photon API reverse error: ${res.statusText}`);
    const data = (await res.json()) as PhotonResponse;
    const firstFeature = data.features?.[0];
    if (firstFeature) return formatPhotonName(firstFeature.properties);
    return 'Ubicación desconocida';
  } catch (err) {
    console.error('⚠️ [Photon Geocoding] Reverse failed:', err);
    throw err;
  }
}
