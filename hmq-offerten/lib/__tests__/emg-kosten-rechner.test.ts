import { describe, it, expect } from 'vitest';
import {
  berechneEmgKosten,
  erstelleEmgGespeicherteWerte,
  ermittleWochentarif,
  emgTarife,
} from '@/lib/emg-kosten-rechner';
import { createEmptyEmg, EmgKonfiguration } from '@/lib/types';
import { DEFAULT_EMG_BASISWERTE } from '@/lib/constants';
import type { EmgBasiswerte } from '@/lib/supabase';

const BASIS: EmgBasiswerte = DEFAULT_EMG_BASISWERTE;

function emgMuster(overrides: Partial<EmgKonfiguration> = {}): EmgKonfiguration {
  // Muster-Offerte 51.26.392 "mit EMG": 3 Geräte, 16 Wochen, Grundpauschale 700
  const emg = createEmptyEmg();
  emg.anzahlGeraete = 3;
  emg.anzahlWochen = 16;
  emg.overrides.grundpauschaleEnd = 700;
  return { ...emg, ...overrides };
}

describe('ermittleWochentarif', () => {
  const tarife = emgTarife(BASIS);

  it('Bandgrenzen: massgebend ist die Laufzeit in Wochen', () => {
    expect(ermittleWochentarif(tarife, 1)).toBe(100);
    expect(ermittleWochentarif(tarife, 9)).toBe(100);
    expect(ermittleWochentarif(tarife, 10)).toBe(80);
    expect(ermittleWochentarif(tarife, 16)).toBe(80);
    expect(ermittleWochentarif(tarife, 24)).toBe(80);
    expect(ermittleWochentarif(tarife, 25)).toBe(75);
    expect(ermittleWochentarif(tarife, 49)).toBe(75);
    expect(ermittleWochentarif(tarife, 50)).toBe(65);
    expect(ermittleWochentarif(tarife, 200)).toBe(65);
  });

  it('unterhalb des ersten Bands gilt Band 1', () => {
    expect(ermittleWochentarif(tarife, 0)).toBe(100);
  });
});

describe('berechneEmgKosten', () => {
  it('Muster-Offerte 51.26.392: 3 Geräte, 16 Wochen, Grundpauschale 700', () => {
    const e = berechneEmgKosten(emgMuster(), BASIS);
    expect(e.wochentarif).toBe(80);
    expect(e.geraetewochen).toBe(48);
    expect(e.vorhalten).toBe(3840); // 48 Gerätewochen × CHF 80
    expect(e.grundpauschale).toBe(700);
    expect(e.abschlussberichtAktiv).toBe(false);
    expect(e.zwischentotal).toBe(4540); // Abschlussbericht nicht eingerechnet
    expect(e.mwstBetrag).toBe(367.75); // 4540 × 0.081 = 367.74 → 5-Rappen-Rundung
    expect(e.totalInklMwst).toBe(4907.75);
  });

  it('Abschlussbericht angekreuzt: fliesst ins Total, Preis überschreibbar', () => {
    const mitBericht = berechneEmgKosten(emgMuster({ abschlussbericht: true }), BASIS);
    expect(mitBericht.abschlussberichtPreis).toBe(250);
    expect(mitBericht.zwischentotal).toBe(4790);

    const eigenerPreis = emgMuster({ abschlussbericht: true });
    eigenerPreis.overrides.abschlussberichtPreisEnd = 300;
    const e = berechneEmgKosten(eigenerPreis, BASIS);
    expect(e.abschlussberichtPreis).toBe(300);
    expect(e.zwischentotal).toBe(4840);
  });

  it('Grundpauschale aus Komponenten (ohne Override)', () => {
    const emg = createEmptyEmg();
    emg.anzahlGeraete = 3;
    emg.anzahlWochen = 16;
    emg.grundpauschale = {
      organisationH: 1, // 120
      beschaffungH: 0,
      konfigurationStk: null, // auto = 3 Geräte → 135
      installationH: 1, // 120
      deinstallationH: 1, // 120
      fahrtenInstallationKm: 50, // 30
      reisezeitInstallationH: 0.5, // 60
      fahrtenDeinstallationKm: 50, // 30
      reisezeitDeinstallationH: 0.5, // 60
    };
    const e = berechneEmgKosten(emg, BASIS);
    expect(e.grundpauschaleBerechnet).toBe(675);
    expect(e.grundpauschale).toBe(675);
    // Konfiguration folgt automatisch der Geräteanzahl
    const konfig = e.komponenten.find(k => k.key === 'konfigurationStk')!;
    expect(konfig.anzahl).toBe(3);
    expect(konfig.betrag).toBe(135);
  });

  it('Konfiguration-Anzahl ist überschreibbar', () => {
    const emg = emgMuster();
    emg.grundpauschale.konfigurationStk = 5;
    const e = berechneEmgKosten(emg, BASIS);
    const konfig = e.komponenten.find(k => k.key === 'konfigurationStk')!;
    expect(konfig.anzahl).toBe(5);
    expect(konfig.betrag).toBe(225);
  });

  it('Vorhalten-Override ersetzt die Berechnung', () => {
    const emg = emgMuster();
    emg.overrides.vorhaltenEnd = 4000;
    const e = berechneEmgKosten(emg, BASIS);
    expect(e.vorhaltenBerechnet).toBe(3840);
    expect(e.vorhalten).toBe(4000);
    expect(e.zwischentotal).toBe(4700);
  });

  it('EMG-Rabatt: Zwischentotal bleibt vor Rabatt, MwSt/Total rechnen danach', () => {
    const e = berechneEmgKosten(emgMuster({ rabattProzent: 10 }), BASIS);
    expect(e.zwischentotal).toBe(4540);
    expect(e.rabattBetrag).toBe(454);
    // (4540 - 454) × 1.081 = 4416.97 → gerundet
    expect(e.mwstBetrag).toBe(330.95);
    expect(e.totalInklMwst).toBe(4416.95);
  });

  it('leere Eingaben (keine Geräte/Wochen) ergeben 0-Beträge statt NaN', () => {
    const e = berechneEmgKosten(createEmptyEmg(), BASIS);
    expect(e.geraetewochen).toBe(0);
    expect(e.vorhalten).toBe(0);
    expect(e.grundpauschale).toBe(0);
    expect(e.zwischentotal).toBe(0);
    expect(e.totalInklMwst).toBe(0);
  });
});

describe('erstelleEmgGespeicherteWerte', () => {
  it('friert alle dokumentrelevanten Werte ein', () => {
    const werte = erstelleEmgGespeicherteWerte(emgMuster(), BASIS);
    expect(werte).toMatchObject({
      anzahlGeraete: 3,
      anzahlWochen: 16,
      geraetewochen: 48,
      wochentarif: 80,
      grundpauschale: 700,
      vorhalten: 3840,
      abschlussberichtAktiv: false,
      abschlussberichtPreis: 250,
      zwischentotal: 4540,
      rabattProzent: 0,
      rabattBetrag: 0,
      mwstBetrag: 367.75,
      totalInklMwst: 4907.75,
    });
    expect(werte.tarife).toEqual([
      { abWochen: 1, preisChf: 100 },
      { abWochen: 10, preisChf: 80 },
      { abWochen: 25, preisChf: 75 },
      { abWochen: 50, preisChf: 65 },
    ]);
  });
});
