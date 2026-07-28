import { EmgBasiswerte } from './supabase';
import {
  EmgGespeicherteWerte,
  EmgKonfiguration,
  EmgTarifband,
} from './types';
import { berechneRabattUndMwst, rundeAuf5Rappen } from './kosten-helpers';

// =====================================================
// EMG-KOSTENBERECHNUNG (Erschütterungsmessung)
// =====================================================

export interface EmgKomponente {
  key: string;
  label: string;
  einheit: 'h' | 'Stk.' | 'km';
  anzahl: number;
  ansatz: number;
  betrag: number;
}

export interface EmgErgebnis {
  komponenten: EmgKomponente[];
  grundpauschaleBerechnet: number;
  grundpauschale: number; // Override oder berechnet
  geraetewochen: number;
  wochentarif: number; // angewendeter Bandtarif pro Gerät/Woche
  tarife: EmgTarifband[];
  vorhaltenBerechnet: number;
  vorhalten: number; // Override oder berechnet
  abschlussberichtAktiv: boolean;
  abschlussberichtPreis: number; // Override oder Basiswert
  zwischentotal: number;
  rabattProzent: number;
  rabattBetrag: number;
  mwstBetrag: number;
  totalInklMwst: number;
}

export function emgTarife(basiswerte: EmgBasiswerte): EmgTarifband[] {
  return [
    { abWochen: basiswerte.tarif1_ab, preisChf: basiswerte.tarif1_chf },
    { abWochen: basiswerte.tarif2_ab, preisChf: basiswerte.tarif2_chf },
    { abWochen: basiswerte.tarif3_ab, preisChf: basiswerte.tarif3_chf },
    { abWochen: basiswerte.tarif4_ab, preisChf: basiswerte.tarif4_chf },
  ];
}

// Massgebend ist die Laufzeit in Wochen (nicht Gerätewochen):
// höchstes Band, dessen Schwelle erreicht ist. Unterhalb des ersten Bands gilt Band 1.
export function ermittleWochentarif(tarife: EmgTarifband[], wochen: number): number {
  const sortiert = [...tarife].sort((a, b) => a.abWochen - b.abWochen);
  let preis = sortiert[0]?.preisChf ?? 0;
  for (const band of sortiert) {
    if (wochen >= band.abWochen) preis = band.preisChf;
  }
  return preis;
}

export function berechneEmgKosten(
  emg: EmgKonfiguration,
  basiswerte: EmgBasiswerte
): EmgErgebnis {
  const geraete = emg.anzahlGeraete ?? 0;
  const wochen = emg.anzahlWochen ?? 0;
  const g = emg.grundpauschale;
  const konfigurationStk = g.konfigurationStk ?? geraete;

  const komponentenRoh: Omit<EmgKomponente, 'betrag'>[] = [
    { key: 'organisationH', label: 'Organisation', einheit: 'h', anzahl: g.organisationH, ansatz: basiswerte.stundensatz },
    { key: 'beschaffungH', label: 'Beschaffung Geräte (sofern Mietgeräte nötig)', einheit: 'h', anzahl: g.beschaffungH, ansatz: basiswerte.stundensatz },
    { key: 'konfigurationStk', label: 'Konfiguration', einheit: 'Stk.', anzahl: konfigurationStk, ansatz: basiswerte.konfiguration_stk_chf },
    { key: 'installationH', label: 'Installation', einheit: 'h', anzahl: g.installationH, ansatz: basiswerte.stundensatz },
    { key: 'deinstallationH', label: 'Deinstallation', einheit: 'h', anzahl: g.deinstallationH, ansatz: basiswerte.stundensatz },
    { key: 'fahrtenInstallationKm', label: 'Fahrkosten Installation', einheit: 'km', anzahl: g.fahrtenInstallationKm, ansatz: basiswerte.km_satz },
    { key: 'reisezeitInstallationH', label: 'Reisezeit Installation', einheit: 'h', anzahl: g.reisezeitInstallationH, ansatz: basiswerte.stundensatz },
    { key: 'fahrtenDeinstallationKm', label: 'Fahrkosten Deinstallation', einheit: 'km', anzahl: g.fahrtenDeinstallationKm, ansatz: basiswerte.km_satz },
    { key: 'reisezeitDeinstallationH', label: 'Reisezeit Deinstallation', einheit: 'h', anzahl: g.reisezeitDeinstallationH, ansatz: basiswerte.stundensatz },
  ];
  const komponenten: EmgKomponente[] = komponentenRoh.map(k => ({
    ...k,
    betrag: rundeAuf5Rappen(k.anzahl * k.ansatz),
  }));

  const grundpauschaleBerechnet = rundeAuf5Rappen(
    komponenten.reduce((sum, k) => sum + k.betrag, 0)
  );
  const grundpauschale = emg.overrides.grundpauschaleEnd ?? grundpauschaleBerechnet;

  const tarife = emgTarife(basiswerte);
  const wochentarif = ermittleWochentarif(tarife, wochen);
  const geraetewochen = geraete * wochen;
  const vorhaltenBerechnet = rundeAuf5Rappen(geraetewochen * wochentarif);
  const vorhalten = emg.overrides.vorhaltenEnd ?? vorhaltenBerechnet;

  const abschlussberichtPreis =
    emg.overrides.abschlussberichtPreisEnd ?? basiswerte.abschlussbericht_chf;

  const zwischentotal = rundeAuf5Rappen(
    grundpauschale + vorhalten + (emg.abschlussbericht ? abschlussberichtPreis : 0)
  );

  // Zwischentotal im Dokument ist VOR Rabatt; MwSt/Total rechnen nach Rabatt
  const { rabattBetrag, mwstBetrag, total } =
    berechneRabattUndMwst(zwischentotal, emg.rabattProzent);

  return {
    komponenten,
    grundpauschaleBerechnet,
    grundpauschale,
    geraetewochen,
    wochentarif,
    tarife,
    vorhaltenBerechnet,
    vorhalten,
    abschlussberichtAktiv: emg.abschlussbericht,
    abschlussberichtPreis,
    zwischentotal,
    rabattProzent: emg.rabattProzent,
    rabattBetrag,
    mwstBetrag,
    totalInklMwst: total,
  };
}

export function erstelleEmgGespeicherteWerte(
  emg: EmgKonfiguration,
  basiswerte: EmgBasiswerte
): EmgGespeicherteWerte {
  const e = berechneEmgKosten(emg, basiswerte);
  return {
    anzahlGeraete: emg.anzahlGeraete ?? 0,
    anzahlWochen: emg.anzahlWochen ?? 0,
    geraetewochen: e.geraetewochen,
    wochentarif: e.wochentarif,
    tarife: e.tarife,
    grundpauschale: e.grundpauschale,
    vorhalten: e.vorhalten,
    abschlussberichtAktiv: e.abschlussberichtAktiv,
    abschlussberichtPreis: e.abschlussberichtPreis,
    zwischentotal: e.zwischentotal,
    rabattProzent: e.rabattProzent,
    rabattBetrag: e.rabattBetrag,
    mwstBetrag: e.mwstBetrag,
    totalInklMwst: e.totalInklMwst,
  };
}
