import { Standort, Ansprechpartner, Offerte } from "./types";
import standorteData from "./data/standorte.json";
import ansprechpartnerData from "./data/ansprechpartner.json";

const STANDORTE_KEY = "hmq_standorte";
const ANSPRECHPARTNER_KEY = "hmq_ansprechpartner";
const OFFERTE_KEY = "hmq_offerte_draft";

// Standorte
export function getStandorte(): Standort[] {
  if (typeof window === "undefined") return standorteData as Standort[];
  const stored = localStorage.getItem(STANDORTE_KEY);
  if (!stored) {
    localStorage.setItem(STANDORTE_KEY, JSON.stringify(standorteData));
    return standorteData as Standort[];
  }
  return JSON.parse(stored);
}

export function saveStandorte(standorte: Standort[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STANDORTE_KEY, JSON.stringify(standorte));
}

export function addStandort(standort: Omit<Standort, "id">): Standort {
  const standorte = getStandorte();
  const newStandort: Standort = {
    ...standort,
    id: crypto.randomUUID(),
  };
  standorte.push(newStandort);
  saveStandorte(standorte);
  return newStandort;
}

export function updateStandort(id: string, standort: Partial<Standort>): void {
  const standorte = getStandorte();
  const index = standorte.findIndex((s) => s.id === id);
  if (index !== -1) {
    standorte[index] = { ...standorte[index], ...standort };
    saveStandorte(standorte);
  }
}

export function deleteStandort(id: string): void {
  const standorte = getStandorte().filter((s) => s.id !== id);
  saveStandorte(standorte);
}

// Ansprechpartner
export function getAnsprechpartner(): Ansprechpartner[] {
  if (typeof window === "undefined") return ansprechpartnerData as Ansprechpartner[];
  const stored = localStorage.getItem(ANSPRECHPARTNER_KEY);
  if (!stored) {
    localStorage.setItem(ANSPRECHPARTNER_KEY, JSON.stringify(ansprechpartnerData));
    return ansprechpartnerData as Ansprechpartner[];
  }
  return JSON.parse(stored);
}

export function saveAnsprechpartner(ansprechpartner: Ansprechpartner[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ANSPRECHPARTNER_KEY, JSON.stringify(ansprechpartner));
}

export function addAnsprechpartner(
  ansprechpartner: Omit<Ansprechpartner, "id">
): Ansprechpartner {
  const liste = getAnsprechpartner();
  const newAnsprechpartner: Ansprechpartner = {
    ...ansprechpartner,
    id: crypto.randomUUID(),
  };
  liste.push(newAnsprechpartner);
  saveAnsprechpartner(liste);
  return newAnsprechpartner;
}

export function updateAnsprechpartner(
  id: string,
  ansprechpartner: Partial<Ansprechpartner>
): void {
  const liste = getAnsprechpartner();
  const index = liste.findIndex((a) => a.id === id);
  if (index !== -1) {
    liste[index] = { ...liste[index], ...ansprechpartner };
    saveAnsprechpartner(liste);
  }
}

export function deleteAnsprechpartner(id: string): void {
  const liste = getAnsprechpartner().filter((a) => a.id !== id);
  saveAnsprechpartner(liste);
}

// Offerte Draft
export function getOfferteDraft(): Partial<Offerte> | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(OFFERTE_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function saveOfferteDraft(offerte: Partial<Offerte>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(OFFERTE_KEY, JSON.stringify(offerte));
}

export function clearOfferteDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(OFFERTE_KEY);
}
