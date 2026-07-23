import { describe, it, expect, afterEach, vi } from 'vitest';
import { haversineKm, naechsterStandort, geocodeOrt, STANDORT_KOORDINATEN } from '@/lib/standort-logik';

describe('haversineKm', () => {
  it('Distanz Zürich-Opfikon nach Chur ca. 95 km Luftlinie', () => {
    const d = haversineKm(STANDORT_KOORDINATEN.zh, STANDORT_KOORDINATEN.gr);
    expect(d).toBeGreaterThan(85);
    expect(d).toBeLessThan(105);
  });

  it('Distanz zum selben Punkt ist 0', () => {
    expect(haversineKm(STANDORT_KOORDINATEN.ag, STANDORT_KOORDINATEN.ag)).toBe(0);
  });
});

describe('naechsterStandort', () => {
  it('Weinfelden TG -> Zürich-Opfikon', () => {
    expect(naechsterStandort({ lat: 47.5686, lon: 9.1055 }).standortId).toBe('zh');
  });

  it('Landquart GR -> Chur', () => {
    expect(naechsterStandort({ lat: 46.9557, lon: 9.5779 }).standortId).toBe('gr');
  });

  it('Luzern LU -> Zofingen', () => {
    expect(naechsterStandort({ lat: 47.0547, lon: 8.3009 }).standortId).toBe('ag');
  });

  it('liefert die Distanz zum gewählten Standort', () => {
    const r = naechsterStandort(STANDORT_KOORDINATEN.gr);
    expect(r.standortId).toBe('gr');
    expect(r.distanzKm).toBe(0);
  });
});

describe('geocodeOrt', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('liest lat/lon aus der geo.admin-Antwort', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ attrs: { lat: 47.5866, lon: 9.0855 } }] }),
    }));
    expect(await geocodeOrt('Ottoberg')).toEqual({ lat: 47.5866, lon: 9.0855 });
  });

  it('liefert null bei leerem Ort, leerer Antwort und Netzwerkfehler', async () => {
    expect(await geocodeOrt('   ')).toBeNull();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    }));
    expect(await geocodeOrt('Nirgendwo')).toBeNull();

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await geocodeOrt('Zürich')).toBeNull();
  });
});
