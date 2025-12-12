import { Standort, Ansprechpartner } from './types';
import standorteData from './data/standorte.json';
import ansprechpartnerData from './data/ansprechpartner.json';

const STORAGE_KEYS = {
  STANDORTE: 'hmq_standorte',
  ANSPRECHPARTNER: 'hmq_ansprechpartner',
};

// === STANDORTE ===
export function getStandorte(): Standort[] {
  if (typeof window === 'undefined') return standorteData;

  const stored = localStorage.getItem(STORAGE_KEYS.STANDORTE);
  if (stored) {
    return JSON.parse(stored);
  }
  return standorteData;
}

export function saveStandorte(standorte: Standort[]): void {
  localStorage.setItem(STORAGE_KEYS.STANDORTE, JSON.stringify(standorte));
}

export function getStandortById(id: string): Standort | undefined {
  return getStandorte().find(s => s.id === id);
}

// === ANSPRECHPARTNER ===
export function getAnsprechpartner(): Ansprechpartner[] {
  if (typeof window === 'undefined') return ansprechpartnerData;

  const stored = localStorage.getItem(STORAGE_KEYS.ANSPRECHPARTNER);
  if (stored) {
    return JSON.parse(stored);
  }
  return ansprechpartnerData;
}

export function saveAnsprechpartner(ansprechpartner: Ansprechpartner[]): void {
  localStorage.setItem(STORAGE_KEYS.ANSPRECHPARTNER, JSON.stringify(ansprechpartner));
}

export function getAnsprechpartnerById(id: string): Ansprechpartner | undefined {
  return getAnsprechpartner().find(a => a.id === id);
}
