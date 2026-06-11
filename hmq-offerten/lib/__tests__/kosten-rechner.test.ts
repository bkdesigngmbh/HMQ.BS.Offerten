import { describe, it, expect } from 'vitest';
import { berechneKosten } from '@/lib/kosten-rechner';
import type { KostenKategorie, KostenBasiswerte } from '@/lib/supabase';
import type { KategorieEingabe, KostenOverrides, KostenSpesen } from '@/lib/types';

// Snapshot-Netz für die zentrale Kostenberechnung. Jede ungewollte Änderung am
// Berechnungs-/Rundungsverhalten lässt diese Tests fehlschlagen.

function mkKategorie(id: string, faktor: number, sortierung: number): KostenKategorie {
  return {
    id,
    titel: id,
    beschreibung: null,
    sortierung,
    faktor_grundlagen: faktor,
    faktor_termin: faktor,
    faktor_aufnahme: faktor,
    faktor_bericht: faktor,
    faktor_kontrolle: faktor,
    faktor_abschluss: faktor,
    created_at: '',
    updated_at: '',
  };
}

const basiswerte: KostenBasiswerte = {
  id: 1,
  grundlagen_chf: 50,
  termin_chf: 30,
  bericht_chf: 40,
  kontrolle_chf: 20,
  zustellbestaetigung_chf: 10,
  datenabgabe_chf: 15,
  basisstunden_aufnahme: 2,
  stundensatz_aufnahme: 143,
  usb_pauschal: 80,
  binden_einheitspreis: 25,
  km_satz: 0.7,
  reisezeit_satz: 143,
  verpflegung_satz: 30,
  uebernachtung_satz: 180,
  updated_at: '',
};

const config: KostenKategorie[] = [mkKategorie('k1', 1, 1), mkKategorie('k2', 2, 2)];
const eingabe: KategorieEingabe[] = [
  { kategorieId: 'k1', titel: 'k1', anzahl: 3 },
  { kategorieId: 'k2', titel: 'k2', anzahl: 1 },
];
const spesen: KostenSpesen = {
  kilometer: 100,
  reisezeitStunden: 2,
  verpflegungAnzahl: 1,
  uebernachtungenAnzahl: 0,
};

describe('berechneKosten', () => {
  it('Standardfall ohne Overrides (Snapshot)', () => {
    const overrides: KostenOverrides = { stundenEnd: null, bindemengeEnd: null };
    expect(berechneKosten(eingabe, config, basiswerte, overrides, spesen)).toMatchSnapshot();
  });

  it('mit Stunden- und Bindemengen-Override (Snapshot)', () => {
    const overrides: KostenOverrides = { stundenEnd: 16, bindemengeEnd: 5 };
    expect(berechneKosten(eingabe, config, basiswerte, overrides, spesen)).toMatchSnapshot();
  });

  it('leere Eingabe ergibt Nullpreise', () => {
    const overrides: KostenOverrides = { stundenEnd: null, bindemengeEnd: null };
    const r = berechneKosten([], config, basiswerte, overrides, spesen);
    expect(r.totalN).toBe(0);
    expect(r.usb.betrag).toBe(0);
  });
});
