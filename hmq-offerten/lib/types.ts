// === STAMMDATEN ===
export interface Standort {
  id: string;
  name: string;
  strasse: string;
  plzOrt: string;
  telefon: string;
}

export interface Ansprechpartner {
  id: string;
  vorname: string;
  nachname: string;
  funktion: string;
  unterschriftDatei: string;
}

export interface Empfaenger {
  firma: string;
  abteilung: string;
  anrede: string;
  vorname: string;
  nachname: string;
  funktion: string;
  strasse: string;
  plz: string;
  ort: string;
}

export interface Projekt {
  ort: string;
  bezeichnung: string;
  anfrageDatum: string;
}

export interface Kosten {
  leistungspreis: number;
  rabattProzent: number;
}

export interface Planbeilage {
  dateiname: string;
  base64: string;
  mimeType: 'image/png' | 'image/jpeg';
  width?: number;  // Original-Breite in Pixeln
  height?: number; // Original-Höhe in Pixeln
}

export interface CheckboxenArtBauvorhaben {
  neubau: boolean;
  umbau: boolean;
  rueckbau: boolean;
  sonstiges: string;
}

export interface CheckboxenArtGebaeude {
  efhFreistehend: boolean;
  reihenhaus: boolean;
  terrassenhaus: boolean;
  mfh: boolean;
  strassen: boolean;
  kunstbauten: boolean;
  sonstiges1: string;
  sonstiges2: string;
}

export interface CheckboxenTaetigkeiten {
  aushub: boolean;
  rammarbeiten: boolean;
  mikropfaehle: boolean;
  baustellenverkehr: boolean;
  schwereMaschinen: boolean;
  sprengungen: boolean;
  diverses: boolean;
  sonstiges: string;
}

export interface CheckboxenKoordination {
  schriftlicheInfo: boolean;
  terminvereinbarung: boolean;
  durchAuftraggeber: boolean;
  sonstiges: string;
}

export interface CheckboxenErstaufnahme {
  fassaden: boolean;
  strassen: boolean;
  strassenBelag: boolean;
  strassenRand: boolean;
  innenraeume: boolean;
  aussenanlagen: boolean;
  sonstiges: string;
}

export interface CheckboxenDokumentation {
  rissprotokoll: boolean;
  fotoAussen: boolean;
  fotoInnen: boolean;
  fotoStrasse: boolean;
  zustellbestaetigung: boolean;
  datenabgabe: boolean;
}

export interface Checkboxen {
  artBauvorhaben: CheckboxenArtBauvorhaben;
  artGebaeude: CheckboxenArtGebaeude;
  taetigkeiten: CheckboxenTaetigkeiten;
  koordination: CheckboxenKoordination;
  erstaufnahme: CheckboxenErstaufnahme;
  dokumentation: CheckboxenDokumentation;
}

// =====================================================
// KOSTENBERECHNUNG TYPEN
// =====================================================

export interface KategorieEingabe {
  kategorieId: string;
  titel: string;
  anzahl: number;
}

export interface KostenOverrides {
  stundenEnd: number | null;      // Override für Zustandsaufnahme-Stunden
  bindemengeEnd: number | null;   // Override für Bindemenge
}

export interface KostenSpesen {
  kilometer: number;
  reisezeitStunden: number;
  verpflegungAnzahl: number;
  uebernachtungenAnzahl: number;
}

// Gespeicherte berechnete Werte (werden mit der Offerte gespeichert)
export interface GespeicherteKostenWerte {
  grundlagen: number;
  termin: number;
  aufnahme: number;
  aufnahmeStunden: number;
  bericht: number;
  kontrolle: number;
  abschluss: number;
  material: number;
  materialUsbKosten: number;
  materialBindeAnzahl: number;
  materialBindeKosten: number;
  spesen: number;
  zwischentotal: number;
  rabattProzent: number;
  rabattBetrag: number;
  mwstBetrag: number;
  totalInklMwst: number;
}

export interface KostenBerechnung {
  kategorien: KategorieEingabe[];
  overrides: KostenOverrides;
  spesen: KostenSpesen;
  gespeicherteWerte?: GespeicherteKostenWerte;
}

export interface Offerte {
  offertnummer: string;
  datum: string;
  standortId: string;
  ansprechpartnerIds: string[];
  empfaenger: Empfaenger;
  projekt: Projekt;
  kosten: Kosten;
  kostenBerechnung: KostenBerechnung;
  vorlaufzeit: string;
  einsatzpauschalen: number;
  checkboxen: Checkboxen;
  planbeilage: Planbeilage | null;
  planbeilageGisLink?: string; // GIS-Link (optional, wird nicht ins Word eingefügt)
}

export function createEmptyOfferte(): Offerte {
  const heute = new Date().toISOString().split('T')[0];
  return {
    offertnummer: '',
    datum: heute,
    standortId: 'zh',
    ansprechpartnerIds: ['bpa', 'bho'],
    empfaenger: {
      firma: '',
      abteilung: '',
      anrede: '',
      vorname: '',
      nachname: '',
      funktion: '',
      strasse: '',
      plz: '',
      ort: '',
    },
    projekt: {
      ort: '',
      bezeichnung: '',
      anfrageDatum: heute,
    },
    kosten: {
      leistungspreis: 0,
      rabattProzent: 0,
    },
    kostenBerechnung: {
      kategorien: [],
      overrides: {
        stundenEnd: null,
        bindemengeEnd: null,
      },
      spesen: {
        kilometer: 0,
        reisezeitStunden: 0,
        verpflegungAnzahl: 0,
        uebernachtungenAnzahl: 0,
      },
    },
    vorlaufzeit: '3 Wochen',
    einsatzpauschalen: 2,
    checkboxen: {
      artBauvorhaben: { neubau: true, umbau: false, rueckbau: false, sonstiges: '' },
      artGebaeude: { efhFreistehend: false, reihenhaus: false, terrassenhaus: false, mfh: true, strassen: false, kunstbauten: false, sonstiges1: '', sonstiges2: '' },
      taetigkeiten: { aushub: true, rammarbeiten: false, mikropfaehle: false, baustellenverkehr: true, schwereMaschinen: true, sprengungen: false, diverses: true, sonstiges: '' },
      koordination: { schriftlicheInfo: true, terminvereinbarung: true, durchAuftraggeber: false, sonstiges: '' },
      erstaufnahme: { fassaden: true, strassen: true, strassenBelag: true, strassenRand: true, innenraeume: true, aussenanlagen: true, sonstiges: '' },
      dokumentation: { rissprotokoll: true, fotoAussen: true, fotoInnen: true, fotoStrasse: true, zustellbestaetigung: true, datenabgabe: true },
    },
    planbeilage: null,
    planbeilageGisLink: '',
  };
}
