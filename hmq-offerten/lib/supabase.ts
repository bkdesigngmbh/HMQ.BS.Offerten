import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =====================================================
// TYPEN
// =====================================================

export interface KostenKategorie {
  id: string;
  titel: string;
  beschreibung: string | null;
  sortierung: number;
  faktor_grundlagen: number;
  faktor_termin: number;
  faktor_aufnahme: number;
  faktor_bericht: number;
  faktor_kontrolle: number;
  faktor_abschluss: number;
  created_at: string;
  updated_at: string;
}

export interface KostenBasiswerte {
  id: number;
  grundlagen_chf: number;
  termin_chf: number;
  bericht_chf: number;
  kontrolle_chf: number;
  zustellbestaetigung_chf: number;
  datenabgabe_chf: number;
  basisstunden_aufnahme: number;
  stundensatz_aufnahme: number;
  usb_pauschal: number;
  binden_einheitspreis: number;
  km_satz: number;
  reisezeit_satz: number;
  verpflegung_satz: number;
  uebernachtung_satz: number;
  updated_at: string;
}

export interface OfferteHistorie {
  id: string;
  offertnummer: string;
  offerte_data: any; // Das komplette Offerte-Objekt als JSON
  projekt_ort: string | null;
  projekt_bezeichnung: string | null;
  empfaenger_firma: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppEinstellungen {
  id: number;
  standort_default: string;
  vorlaufzeit_default: string;
  einsatzpauschalen_default: number;
  standard_checkboxen: any; // JSON-Objekt
  updated_at: string;
}

// =====================================================
// API FUNKTIONEN
// =====================================================

// --- KATEGORIEN ---

export async function getKategorien(): Promise<KostenKategorie[]> {
  const { data, error } = await supabase
    .from('kosten_kategorien')
    .select('*')
    .order('sortierung', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createKategorie(kategorie: Omit<KostenKategorie, 'id' | 'created_at' | 'updated_at'>): Promise<KostenKategorie> {
  const { data, error } = await supabase
    .from('kosten_kategorien')
    .insert(kategorie)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateKategorie(id: string, kategorie: Partial<KostenKategorie>): Promise<KostenKategorie> {
  const { data, error } = await supabase
    .from('kosten_kategorien')
    .update(kategorie)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteKategorie(id: string): Promise<void> {
  const { error } = await supabase
    .from('kosten_kategorien')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// --- BASISWERTE ---

export async function getBasiswerte(): Promise<KostenBasiswerte> {
  const { data, error } = await supabase
    .from('kosten_basiswerte')
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateBasiswerte(basiswerte: Partial<KostenBasiswerte>): Promise<KostenBasiswerte> {
  const { data, error } = await supabase
    .from('kosten_basiswerte')
    .update(basiswerte)
    .eq('id', 1)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- OFFERTEN HISTORIE ---

export async function getOffertenListe(): Promise<Pick<OfferteHistorie, 'id' | 'offertnummer' | 'projekt_ort' | 'projekt_bezeichnung' | 'updated_at'>[]> {
  const { data, error } = await supabase
    .from('offerten_historie')
    .select('id, offertnummer, projekt_ort, projekt_bezeichnung, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getOfferte(offertnummer: string): Promise<OfferteHistorie | null> {
  const { data, error } = await supabase
    .from('offerten_historie')
    .select('*')
    .eq('offertnummer', offertnummer)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

export async function saveOfferte(offerte: any): Promise<OfferteHistorie> {
  const payload = {
    offertnummer: offerte.offertnummer,
    offerte_data: offerte,
    projekt_ort: offerte.projekt?.ort || null,
    projekt_bezeichnung: offerte.projekt?.bezeichnung || null,
    empfaenger_firma: offerte.empfaenger?.firma || null,
  };

  // Upsert: Insert oder Update basierend auf offertnummer
  const { data, error } = await supabase
    .from('offerten_historie')
    .upsert(payload, { onConflict: 'offertnummer' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteOfferte(offertnummer: string): Promise<void> {
  const { error } = await supabase
    .from('offerten_historie')
    .delete()
    .eq('offertnummer', offertnummer);

  if (error) throw error;
}

// --- APP EINSTELLUNGEN ---

export async function getEinstellungen(): Promise<AppEinstellungen> {
  const { data, error } = await supabase
    .from('app_einstellungen')
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateEinstellungen(einstellungen: Partial<AppEinstellungen>): Promise<AppEinstellungen> {
  const { data, error } = await supabase
    .from('app_einstellungen')
    .update(einstellungen)
    .eq('id', 1)
    .select()
    .single();

  if (error) throw error;
  return data;
}
