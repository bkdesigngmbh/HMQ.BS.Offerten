export const MWST_RATE = 0.081;
export const RAPPEN_MULTIPLIER = 20;
export const HOURS_PER_EINSATZPAUSCHALE = 8;
export const EMU_PER_CM = 360000;
export const SUPABASE_NOT_FOUND = 'PGRST116';
export const TEMPLATE_FILENAME = 'Offerte_Template_V13.docx';

// EMG-Basiswerte (Fallback für Tests und als Seed der Supabase-Migration;
// produktiv kommen die Werte aus der Tabelle emg_basiswerte)
export const DEFAULT_EMG_BASISWERTE = {
  id: 1,
  stundensatz: 120,
  konfiguration_stk_chf: 45,
  km_satz: 0.6,
  tarif1_ab: 1,
  tarif1_chf: 100,
  tarif2_ab: 10,
  tarif2_chf: 80,
  tarif3_ab: 25,
  tarif3_chf: 75,
  tarif4_ab: 50,
  tarif4_chf: 65,
  abschlussbericht_chf: 250,
  updated_at: '',
};

export const GERMAN_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export const STANDORTE: Record<string, { name: string; adresse: string }> = {
  zh: {
    name: 'Zürich-Opfikon',
    adresse: 'Balz-Zimmermann-Strasse 7 · 8152 Zürich-Opfikon',
  },
  gr: {
    name: 'Chur',
    adresse: 'Sommeraustrasse 30 · 7000 Chur',
  },
  ag: {
    name: 'Zofingen',
    adresse: 'Vordere Hauptgasse 104 · 4800 Zofingen',
  },
};
