// Automatische Standortwahl: der geografisch nächste Bürostandort zum Projektort
// wird als Absender der Offerte vorgeschlagen (nur Briefkopf, keine Spesenlogik).
// Geocoding über den offiziellen Bund-Service api3.geo.admin.ch (kein API-Key).

export interface Koordinaten {
  lat: number;
  lon: number;
}

export interface NaechsterStandort {
  standortId: string;
  distanzKm: number;
}

// Bürokoordinaten (WGS84), ermittelt via geo.admin.ch SearchServer
export const STANDORT_KOORDINATEN: Record<string, Koordinaten> = {
  zh: { lat: 47.43904, lon: 8.57107 },  // Balz-Zimmermann-Strasse 7, 8152 Zürich-Opfikon
  gr: { lat: 46.84825, lon: 9.5031 },   // Sommeraustrasse 30, 7000 Chur
  ag: { lat: 47.28713, lon: 7.94602 },  // Vordere Hauptgasse 104, 4800 Zofingen
};

// Luftlinie in km (Haversine)
export function haversineKm(a: Koordinaten, b: Koordinaten): number {
  const ERD_RADIUS_KM = 6371;
  const rad = (grad: number) => (grad * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * ERD_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function naechsterStandort(projekt: Koordinaten): NaechsterStandort {
  let best: NaechsterStandort | null = null;
  for (const [standortId, koord] of Object.entries(STANDORT_KOORDINATEN)) {
    const distanzKm = haversineKm(projekt, koord);
    if (!best || distanzKm < best.distanzKm) {
      best = { standortId, distanzKm };
    }
  }
  if (!best) throw new Error('Keine Standortkoordinaten definiert');
  return best;
}

const GEO_ADMIN_SEARCH_URL = 'https://api3.geo.admin.ch/rest/services/api/SearchServer';

interface GeoAdminResult {
  results?: { attrs?: { lat?: number; lon?: number } }[];
}

// Erfolgs-Cache pro Ortsname: die Auto-Logik wird bei jeder Offerten-Änderung neu
// bewertet (z.B. Ordner-Import setzt den Standort auf Default zurück), soll dabei
// aber nicht für denselben Ort erneut das API anfragen. Fehlschläge (unbekannter
// Ort, offline) werden bewusst nicht gecacht, damit ein Retry möglich bleibt.
const geocodeCache = new Map<string, Koordinaten>();

export async function geocodeOrtCached(ort: string): Promise<Koordinaten | null> {
  const key = ort.trim().toLowerCase();
  if (!key) return null;
  const cached = geocodeCache.get(key);
  if (cached) return cached;
  const koordinaten = await geocodeOrt(ort);
  if (koordinaten) geocodeCache.set(key, koordinaten);
  return koordinaten;
}

// Geocodiert einen Schweizer Ortsnamen (inkl. Weiler/Ortsteile wie "Ottoberg").
// Liefert null bei unbekanntem Ort oder Netzwerkfehler; der Aufrufer behält dann
// den bisherigen Standort (kein automatischer Wechsel).
export async function geocodeOrt(ort: string): Promise<Koordinaten | null> {
  const suchtext = ort.trim();
  if (!suchtext) return null;
  try {
    const url = `${GEO_ADMIN_SEARCH_URL}?searchText=${encodeURIComponent(suchtext)}&type=locations&limit=1`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data: GeoAdminResult = await response.json();
    const attrs = data.results?.[0]?.attrs;
    if (typeof attrs?.lat !== 'number' || typeof attrs?.lon !== 'number') return null;
    return { lat: attrs.lat, lon: attrs.lon };
  } catch {
    return null;
  }
}
