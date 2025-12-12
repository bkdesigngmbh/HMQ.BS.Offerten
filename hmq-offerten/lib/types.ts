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
  unterschriftDatei: string; // Dateiname in /public
}

// === EMPFÄNGER ===
export interface Empfaenger {
  anrede: 'Herr' | 'Frau' | 'Firma' | '';
  name: string;
  zusatz: string;
  strasse: string;
  plzOrt: string;
}

// === PROJEKT ===
export interface Projekt {
  ort: string;
  bezeichnung: string;
  anfrageDatum: string;
}

// === CHECKBOXEN ===
export interface CheckboxSelektion {
  // 1.1 Art des Bauvorhabens
  artBauvorhaben: {
    neubau: boolean;
    umbau: boolean;
    rueckbau: boolean;
    sonstiges: string;
  };

  // 1.1 Art des Gebäudes
  artGebaeude: {
    efhFreistehend: boolean;
    reihenhaus: boolean;
    terrassenhaus: boolean;
    mfh: boolean;
    strassen: boolean;
    kunstbauten: boolean;
    sonstiges1: string;
    sonstiges2: string;
  };

  // 1.2 Tätigkeiten
  taetigkeiten: {
    aushub: boolean;
    rammarbeiten: boolean;
    mikropfaehle: boolean;
    baustellenverkehr: boolean;
    schwereMaschinen: boolean;
    sprengungen: boolean;
    diverses: boolean;
    sonstiges: string;
  };

  // 2.1 Koordination
  koordination: {
    schriftlicheInfo: boolean;
    terminvereinbarung: boolean;
    durchAuftraggeber: boolean;
    sonstiges: string;
  };

  // 2.2 Erstaufnahme
  erstaufnahme: {
    fassaden: boolean;
    strassen: boolean;
    strassenBelag: boolean;
    strassenRand: boolean;
    innenraeume: boolean;
    aussenanlagen: boolean;
    sonstiges: string;
  };

  // 2.3 Dokumentation
  dokumentation: {
    rissprotokoll: boolean;
    fotoAussen: boolean;
    fotoInnen: boolean;
    fotoStrasse: boolean;
    zustellbestaetigung: boolean;
    datenabgabe: boolean;
  };
}

// === KOSTEN ===
export interface Kosten {
  leistungspreis: number;
  rabattProzent: number;
  // MwSt ist fix 8.1%
}

// === PLANBEILAGE ===
export interface Planbeilage {
  dateiname: string;
  base64: string;
  mimeType: 'image/png' | 'image/jpeg';
}

// === HAUPTOBJEKT OFFERTE ===
export interface Offerte {
  // Meta
  offertnummer: string;        // Format: "51.25.XXX"
  datum: string;               // ISO Date
  standortId: string;
  ansprechpartnerIds: string[]; // Meist 2 Personen

  // Empfänger
  empfaenger: Empfaenger;

  // Projekt
  projekt: Projekt;

  // Checkboxen
  checkboxen: CheckboxSelektion;

  // Planbeilage
  planbeilage: Planbeilage | null;

  // Kosten
  kosten: Kosten;

  // Termine
  vorlaufzeit: string;         // z.B. "3 Wochen"
}

// === HELPER: Leere Offerte ===
export const createEmptyOfferte = (): Offerte => ({
  offertnummer: '',
  datum: new Date().toISOString().split('T')[0],
  standortId: 'zh',
  ansprechpartnerIds: ['bpa', 'bho'],
  empfaenger: {
    anrede: '',
    name: '',
    zusatz: '',
    strasse: '',
    plzOrt: '',
  },
  projekt: {
    ort: '',
    bezeichnung: '',
    anfrageDatum: '',
  },
  checkboxen: {
    artBauvorhaben: { neubau: false, umbau: false, rueckbau: false, sonstiges: '' },
    artGebaeude: {
      efhFreistehend: false, reihenhaus: false, terrassenhaus: false,
      mfh: false, strassen: false, kunstbauten: false,
      sonstiges1: '', sonstiges2: ''
    },
    taetigkeiten: {
      aushub: false, rammarbeiten: false, mikropfaehle: false,
      baustellenverkehr: false, schwereMaschinen: false, sprengungen: false,
      diverses: false, sonstiges: ''
    },
    koordination: {
      schriftlicheInfo: false, terminvereinbarung: false,
      durchAuftraggeber: false, sonstiges: ''
    },
    erstaufnahme: {
      fassaden: false, strassen: false, strassenBelag: false,
      strassenRand: false, innenraeume: false, aussenanlagen: false,
      sonstiges: ''
    },
    dokumentation: {
      rissprotokoll: false, fotoAussen: false, fotoInnen: false,
      fotoStrasse: false, zustellbestaetigung: false, datenabgabe: false
    },
  },
  planbeilage: null,
  kosten: {
    leistungspreis: 0,
    rabattProzent: 5,
  },
  vorlaufzeit: '3 Wochen',
});

// === TAB NAVIGATION ===
export type TabId = 'daten' | 'kosten';
