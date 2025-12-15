import { KostenKategorie, KostenBasiswerte } from './supabase';
import { KategorieEingabe, KostenOverrides, KostenSpesen } from './types';

// =====================================================
// BERECHNUNGS-ERGEBNISSE
// =====================================================

export interface KostenPosition {
  label: string;
  betrag: number;
  details?: string;
}

export interface KostenErgebnis {
  // Einzelne Positionen
  grundlagen: KostenPosition;
  termin: KostenPosition;
  aufnahme: KostenPosition & { stundenRoh: number; stundenEnd: number };
  bericht: KostenPosition;
  kontrolle: KostenPosition;
  zustellbestaetigung: KostenPosition;
  datenabgabe: KostenPosition;
  usb: KostenPosition;
  binden: KostenPosition & { mengeStandard: number; mengeEnd: number };
  spesen: KostenPosition;

  // Summen
  totalN: number;
  zwischentotal: number;
  endpreis: number;
}

// =====================================================
// 5-RAPPEN-RUNDUNG
// =====================================================

export function rundeAuf5Rappen(betrag: number): number {
  return Math.round(betrag * 20) / 20;
}

// =====================================================
// HAUPTBERECHNUNG
// =====================================================

export function berechneKosten(
  kategorienEingabe: KategorieEingabe[],
  kategorienConfig: KostenKategorie[],
  basiswerte: KostenBasiswerte,
  overrides: KostenOverrides,
  spesen: KostenSpesen
): KostenErgebnis {

  // Kategorien mit Faktoren zusammenführen
  const kategorienMitFaktoren = kategorienEingabe.map(eingabe => {
    const config = kategorienConfig.find(k => k.id === eingabe.kategorieId);
    return {
      ...eingabe,
      faktor_grundlagen: config?.faktor_grundlagen || 1,
      faktor_termin: config?.faktor_termin || 1,
      faktor_aufnahme: config?.faktor_aufnahme || 1,
      faktor_bericht: config?.faktor_bericht || 1,
      faktor_kontrolle: config?.faktor_kontrolle || 1,
      faktor_abschluss: config?.faktor_abschluss || 1,
    };
  });

  // Total N (Summe aller Objekte)
  const totalN = kategorienEingabe.reduce((sum, k) => sum + k.anzahl, 0);

  // =====================================================
  // 1. GRUNDLAGENBESCHAFFUNG
  // Formel: Σ(Anzahl × Faktor × Basiswert)
  // =====================================================
  const grundlagenSumme = kategorienMitFaktoren.reduce(
    (sum, k) => sum + k.anzahl * k.faktor_grundlagen * basiswerte.grundlagen_chf,
    0
  );
  const grundlagen: KostenPosition = {
    label: 'Grundlagenbeschaffung',
    betrag: rundeAuf5Rappen(grundlagenSumme),
  };

  // =====================================================
  // 2. TERMINORGANISATION
  // =====================================================
  const terminSumme = kategorienMitFaktoren.reduce(
    (sum, k) => sum + k.anzahl * k.faktor_termin * basiswerte.termin_chf,
    0
  );
  const termin: KostenPosition = {
    label: 'Terminorganisation',
    betrag: rundeAuf5Rappen(terminSumme),
  };

  // =====================================================
  // 3. ZUSTANDSAUFNAHME VOR ORT (Stunden-basiert)
  // Stunden roh = Σ(Anzahl × Faktor × Basisstunden)
  // Stunden End = Override oder Roh
  // Kosten = Stunden End × Stundensatz
  // =====================================================
  const stundenRoh = kategorienMitFaktoren.reduce(
    (sum, k) => sum + k.anzahl * k.faktor_aufnahme * basiswerte.basisstunden_aufnahme,
    0
  );
  const stundenEnd = overrides.stundenEnd !== null ? overrides.stundenEnd : stundenRoh;
  const aufnahmeBetrag = stundenEnd * basiswerte.stundensatz_aufnahme;

  const aufnahme: KostenPosition & { stundenRoh: number; stundenEnd: number } = {
    label: 'Zustandsaufnahme vor Ort',
    betrag: rundeAuf5Rappen(aufnahmeBetrag),
    details: `${stundenEnd.toFixed(1)} Std. × CHF ${basiswerte.stundensatz_aufnahme.toFixed(2)}`,
    stundenRoh: Math.round(stundenRoh * 10) / 10,
    stundenEnd: Math.round(stundenEnd * 10) / 10,
  };

  // =====================================================
  // 4. BERICHTSERSTELLUNG
  // =====================================================
  const berichtSumme = kategorienMitFaktoren.reduce(
    (sum, k) => sum + k.anzahl * k.faktor_bericht * basiswerte.bericht_chf,
    0
  );
  const bericht: KostenPosition = {
    label: 'Berichtserstellung',
    betrag: rundeAuf5Rappen(berichtSumme),
  };

  // =====================================================
  // 5. BERICHTSKONTROLLE
  // =====================================================
  const kontrolleSumme = kategorienMitFaktoren.reduce(
    (sum, k) => sum + k.anzahl * k.faktor_kontrolle * basiswerte.kontrolle_chf,
    0
  );
  const kontrolle: KostenPosition = {
    label: 'Berichtskontrolle',
    betrag: rundeAuf5Rappen(kontrolleSumme),
  };

  // =====================================================
  // 6.1 ZUSTELLBESTÄTIGUNG
  // =====================================================
  const zustellSumme = kategorienMitFaktoren.reduce(
    (sum, k) => sum + k.anzahl * k.faktor_abschluss * basiswerte.zustellbestaetigung_chf,
    0
  );
  const zustellbestaetigung: KostenPosition = {
    label: 'Zustellbestätigung',
    betrag: rundeAuf5Rappen(zustellSumme),
  };

  // =====================================================
  // 6.2 DATENABGABE AUFTRAGGEBER
  // =====================================================
  const datenabgabeSumme = kategorienMitFaktoren.reduce(
    (sum, k) => sum + k.anzahl * k.faktor_abschluss * basiswerte.datenabgabe_chf,
    0
  );
  const datenabgabe: KostenPosition = {
    label: 'Datenabgabe Auftraggeber',
    betrag: rundeAuf5Rappen(datenabgabeSumme),
  };

  // =====================================================
  // 7.1 USB / DIGITALE DATENABGABE (Pauschal einmalig)
  // =====================================================
  const usb: KostenPosition = {
    label: 'USB/Digitale Datenabgabe',
    betrag: totalN > 0 ? rundeAuf5Rappen(basiswerte.usb_pauschal) : 0,
    details: 'Pauschal',
  };

  // =====================================================
  // 7.2 BERICHT BINDEN
  // Standard = aufrunden(N / 2)
  // Ende = Override oder Standard
  // Kosten = Menge × Einheitspreis
  // =====================================================
  const mengeStandard = Math.ceil(totalN / 2);
  const mengeEnd = overrides.bindemengeEnd !== null ? overrides.bindemengeEnd : mengeStandard;
  const bindenBetrag = mengeEnd * basiswerte.binden_einheitspreis;

  const binden: KostenPosition & { mengeStandard: number; mengeEnd: number } = {
    label: 'Bericht binden',
    betrag: rundeAuf5Rappen(bindenBetrag),
    details: `${mengeEnd} Stk. × CHF ${basiswerte.binden_einheitspreis.toFixed(2)}`,
    mengeStandard,
    mengeEnd,
  };

  // =====================================================
  // 8. SPESEN
  // km × km_satz + Reisezeit × Satz + Verpflegung × Satz + Übernachtung × Satz
  // =====================================================
  const spesenBetrag =
    spesen.kilometer * basiswerte.km_satz +
    spesen.reisezeitStunden * basiswerte.reisezeit_satz +
    spesen.verpflegungAnzahl * basiswerte.verpflegung_satz +
    spesen.uebernachtungenAnzahl * basiswerte.uebernachtung_satz;

  const spesenDetails: string[] = [];
  if (spesen.kilometer > 0) spesenDetails.push(`${spesen.kilometer} km`);
  if (spesen.reisezeitStunden > 0) spesenDetails.push(`${spesen.reisezeitStunden} Std. Reise`);
  if (spesen.verpflegungAnzahl > 0) spesenDetails.push(`${spesen.verpflegungAnzahl}× Verpfl.`);
  if (spesen.uebernachtungenAnzahl > 0) spesenDetails.push(`${spesen.uebernachtungenAnzahl}× Übern.`);

  const spesenPosition: KostenPosition = {
    label: 'Spesen',
    betrag: rundeAuf5Rappen(spesenBetrag),
    details: spesenDetails.join(', ') || 'Keine',
  };

  // =====================================================
  // SUMMEN
  // =====================================================
  const zwischentotal =
    grundlagen.betrag +
    termin.betrag +
    aufnahme.betrag +
    bericht.betrag +
    kontrolle.betrag +
    zustellbestaetigung.betrag +
    datenabgabe.betrag +
    usb.betrag +
    binden.betrag +
    spesenPosition.betrag;

  return {
    grundlagen,
    termin,
    aufnahme,
    bericht,
    kontrolle,
    zustellbestaetigung,
    datenabgabe,
    usb,
    binden,
    spesen: spesenPosition,
    totalN,
    zwischentotal: rundeAuf5Rappen(zwischentotal),
    endpreis: rundeAuf5Rappen(zwischentotal),
  };
}
