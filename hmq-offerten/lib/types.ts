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

// =====================================================
// EMG (ERSCHÜTTERUNGSMESSUNG)
// =====================================================

// 'bs' = nur Beweissicherung (wie bisher), 'bs_emg' = Beweissicherung + EMG,
// 'emg' = nur Erschütterungsmessung
export type Offertart = 'bs' | 'bs_emg' | 'emg';

// Leistungs-Checkboxen im EMG-Abschnitt: standardmässig alle angekreuzt, abwählbar
export interface EmgLeistungen {
  konfiguration: boolean;
  smsAlarmierung: boolean;
  terminvereinbarung: boolean;
  erstinstallation: boolean;
  vorhalten: boolean;
  deinstallation: boolean;
}

// Anzahlen der Grundpauschale-Komponenten (Ansätze kommen aus den EMG-Basiswerten)
export interface EmgGrundpauschaleEingabe {
  organisationH: number;
  beschaffungH: number;
  konfigurationStk: number | null; // null = automatisch gleich Anzahl Geräte
  installationH: number;
  deinstallationH: number;
  fahrtenInstallationKm: number;
  reisezeitInstallationH: number;
  fahrtenDeinstallationKm: number;
  reisezeitDeinstallationH: number;
}

export interface EmgOverrides {
  grundpauschaleEnd: number | null;
  vorhaltenEnd: number | null;
  abschlussberichtPreisEnd: number | null;
}

export interface EmgTarifband {
  abWochen: number;
  preisChf: number;
}

// Beim Speichern/Generieren eingefrorene EMG-Werte (analog GespeicherteKostenWerte)
export interface EmgGespeicherteWerte {
  anzahlGeraete: number;
  anzahlWochen: number;
  geraetewochen: number;
  wochentarif: number; // angewendeter Bandtarif pro Gerät/Woche
  tarife: EmgTarifband[]; // alle Bänder für die Wochentarif-Liste im Dokument
  grundpauschale: number;
  vorhalten: number;
  abschlussberichtAktiv: boolean;
  abschlussberichtPreis: number;
  zwischentotal: number;
  rabattProzent: number;
  rabattBetrag: number;
  mwstBetrag: number;
  totalInklMwst: number;
}

export interface EmgKonfiguration {
  anzahlGeraete: number | null; // bewusst ohne Default, Pflicht bei aktivem EMG
  anzahlWochen: number | null;
  leistungen: EmgLeistungen;
  abschlussbericht: boolean;
  grundpauschale: EmgGrundpauschaleEingabe;
  overrides: EmgOverrides;
  rabattProzent: number;
  gespeicherteWerte?: EmgGespeicherteWerte;
}

export function createEmptyEmg(): EmgKonfiguration {
  return {
    anzahlGeraete: null,
    anzahlWochen: null,
    leistungen: {
      konfiguration: true,
      smsAlarmierung: true,
      terminvereinbarung: true,
      erstinstallation: true,
      vorhalten: true,
      deinstallation: true,
    },
    abschlussbericht: false,
    grundpauschale: {
      organisationH: 0,
      beschaffungH: 0,
      konfigurationStk: null,
      installationH: 0,
      deinstallationH: 0,
      fahrtenInstallationKm: 0,
      reisezeitInstallationH: 0,
      fahrtenDeinstallationKm: 0,
      reisezeitDeinstallationH: 0,
    },
    overrides: {
      grundpauschaleEnd: null,
      vorhaltenEnd: null,
      abschlussberichtPreisEnd: null,
    },
    rabattProzent: 0,
  };
}

// Alte gespeicherte Offerten haben kein offertart-Feld: immer 'bs'
export function getOffertart(offerte: Pick<Offerte, 'offertart'>): Offertart {
  return offerte.offertart ?? 'bs';
}

export interface Offerte {
  offertnummer: string;
  datum: string;
  standortId: string;
  // false = Standort darf automatisch (nächster zum Projektort) gesetzt werden,
  // true = vom Benutzer manuell gewählt. Fehlt bei alten Offerten (undefined):
  // dann kein Auto-Update, damit gespeicherte Standorte unangetastet bleiben.
  standortManuell?: boolean;
  ansprechpartnerIds: string[];
  empfaenger: Empfaenger;
  projekt: Projekt;
  kosten: Kosten;
  kostenBerechnung: KostenBerechnung;
  vorlaufzeit: string;
  einsatzpauschalen: number;
  // Optional (fehlt bei alten gespeicherten Offerten): Abschnitt 2.3 Vergleichsaufnahme
  // plus Kostenzeile "Optional: Leistungen Vergleichsaufnahme" im Dokument aufführen
  vergleichsaufnahme?: boolean;
  // Optional (fehlt bei alten gespeicherten Offerten, dann 'bs'): Offertart
  offertart?: Offertart;
  // Optional: EMG-Konfiguration, nur relevant bei offertart 'bs_emg' oder 'emg'
  emg?: EmgKonfiguration;
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
    standortManuell: false,
    ansprechpartnerIds: ['bpa', 'mme'],
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
    vergleichsaufnahme: false,
    offertart: 'bs',
    emg: createEmptyEmg(),
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
