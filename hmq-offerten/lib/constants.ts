export const MWST_RATE = 0.081;
export const RAPPEN_MULTIPLIER = 20;
export const HOURS_PER_EINSATZPAUSCHALE = 8;
export const EMU_PER_CM = 360000;
export const SUPABASE_NOT_FOUND = 'PGRST116';
export const TEMPLATE_FILENAME = 'Offerte_Template_V11.docx';

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
