export interface Standort {
  id: string;
  name: string;
  adresse: string;
  plz: string;
  ort: string;
}

export interface Ansprechpartner {
  id: string;
  name: string;
  email: string;
  telefon: string;
  standortId: string;
  unterschriftBild?: string;
}

export interface Empfaenger {
  firma: string;
  anrede: string;
  vorname: string;
  nachname: string;
  strasse: string;
  plz: string;
  ort: string;
}

export interface Projekt {
  bezeichnung: string;
  standortId: string;
  ansprechpartnerId: string;
}

export interface Leistung {
  id: string;
  name: string;
  checked: boolean;
}

export interface Kosten {
  arbeit: number;
  material: number;
  zusatz: number;
  rabatt: number;
}

export interface OfferteData {
  empfaenger: Empfaenger;
  projekt: Projekt;
  leistungen: Leistung[];
  kosten: Kosten;
  planBild?: string;
  bemerkungen: string;
}

export type TabId = "daten" | "kosten";
