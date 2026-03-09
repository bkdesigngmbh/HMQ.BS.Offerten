import { MWST_RATE, RAPPEN_MULTIPLIER } from './constants';

/** 5-Rappen-Rundung (Schweizer Standard) */
export function rundeAuf5Rappen(betrag: number): number {
  return Math.round(betrag * RAPPEN_MULTIPLIER) / RAPPEN_MULTIPLIER;
}

/** Format CHF with apostrophe separator: 1'234.50 */
export function formatCHF(amount: number): string {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

/** Berechnet Rabatt, MwSt und Total aus Leistungspreis */
export function berechneRabattUndMwst(leistungspreis: number, rabattProzent: number) {
  const rabattBetrag = rundeAuf5Rappen(leistungspreis * (rabattProzent / 100));
  const zwischentotal = rundeAuf5Rappen(leistungspreis - rabattBetrag);
  const mwstBetrag = rundeAuf5Rappen(zwischentotal * MWST_RATE);
  const total = rundeAuf5Rappen(zwischentotal + mwstBetrag);
  return { rabattBetrag, zwischentotal, mwstBetrag, total };
}
