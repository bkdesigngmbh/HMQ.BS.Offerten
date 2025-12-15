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
  anrede: string;
  vorname: string;
  nachname: string;
  funktion: string;
  strasse: string;
  plzOrt: string;
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

export interface Offerte {
  offertnummer: string;
  datum: string;
  standortId: string;
  ansprechpartnerIds: string[];
  empfaenger: Empfaenger;
  projekt: Projekt;
  kosten: Kosten;
  vorlaufzeit: string;
  einsatzpauschalen: number;
  checkboxen: Checkboxen;
  planbeilage: Planbeilage | null;
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
      anrede: '',
      vorname: '',
      nachname: '',
      funktion: '',
      strasse: '',
      plzOrt: '',
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
    vorlaufzeit: '3 Wochen',
    einsatzpauschalen: 2,
    checkboxen: {
      artBauvorhaben: { neubau: false, umbau: false, rueckbau: false, sonstiges: '' },
      artGebaeude: { efhFreistehend: false, reihenhaus: false, terrassenhaus: false, mfh: false, strassen: false, kunstbauten: false, sonstiges1: '', sonstiges2: '' },
      taetigkeiten: { aushub: false, rammarbeiten: false, mikropfaehle: false, baustellenverkehr: false, schwereMaschinen: false, sprengungen: false, diverses: false, sonstiges: '' },
      koordination: { schriftlicheInfo: false, terminvereinbarung: false, durchAuftraggeber: false, sonstiges: '' },
      erstaufnahme: { fassaden: false, strassen: false, strassenBelag: false, strassenRand: false, innenraeume: false, aussenanlagen: false, sonstiges: '' },
      dokumentation: { rissprotokoll: false, fotoAussen: false, fotoInnen: false, fotoStrasse: false, zustellbestaetigung: false, datenabgabe: false },
    },
    planbeilage: null,
  };
}
