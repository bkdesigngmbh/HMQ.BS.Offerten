import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Lazy initialization to avoid build-time errors
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables not configured');
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

// For backwards compatibility (but will throw at runtime if env vars missing)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as unknown as SupabaseClient;

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

export interface Standort {
  id: string;
  name: string;
  firma: string;
  strasse: string;
  plz: string;
  ort: string;
  created_at?: string;
  updated_at?: string;
}

// =====================================================
// API FUNKTIONEN
// =====================================================

// --- KATEGORIEN ---

export async function getKategorien(): Promise<KostenKategorie[]> {
  const { data, error } = await getSupabase()
    .from('kosten_kategorien')
    .select('*')
    .order('sortierung', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createKategorie(kategorie: Partial<KostenKategorie>): Promise<KostenKategorie> {
  // Nur die benötigten Felder senden - OHNE id, created_at, updated_at (Supabase generiert die)
  const { data, error } = await getSupabase()
    .from('kosten_kategorien')
    .insert({
      titel: kategorie.titel,
      beschreibung: kategorie.beschreibung || null,
      sortierung: kategorie.sortierung || 0,
      faktor_grundlagen: Number.isFinite(kategorie.faktor_grundlagen) ? kategorie.faktor_grundlagen : 1,
      faktor_termin: Number.isFinite(kategorie.faktor_termin) ? kategorie.faktor_termin : 1,
      faktor_aufnahme: Number.isFinite(kategorie.faktor_aufnahme) ? kategorie.faktor_aufnahme : 1,
      faktor_bericht: Number.isFinite(kategorie.faktor_bericht) ? kategorie.faktor_bericht : 1,
      faktor_kontrolle: Number.isFinite(kategorie.faktor_kontrolle) ? kategorie.faktor_kontrolle : 1,
      faktor_abschluss: Number.isFinite(kategorie.faktor_abschluss) ? kategorie.faktor_abschluss : 1,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateKategorie(id: string, kategorie: Partial<KostenKategorie>): Promise<KostenKategorie> {
  // Nur editierbare Felder senden - OHNE id, created_at, updated_at
  const updateData: Record<string, any> = {};

  if (kategorie.titel !== undefined) updateData.titel = kategorie.titel;
  if (kategorie.beschreibung !== undefined) updateData.beschreibung = kategorie.beschreibung || null;
  if (kategorie.sortierung !== undefined) updateData.sortierung = kategorie.sortierung;

  // Faktoren nur wenn sie gültige Zahlen sind
  if (Number.isFinite(kategorie.faktor_grundlagen)) updateData.faktor_grundlagen = kategorie.faktor_grundlagen;
  if (Number.isFinite(kategorie.faktor_termin)) updateData.faktor_termin = kategorie.faktor_termin;
  if (Number.isFinite(kategorie.faktor_aufnahme)) updateData.faktor_aufnahme = kategorie.faktor_aufnahme;
  if (Number.isFinite(kategorie.faktor_bericht)) updateData.faktor_bericht = kategorie.faktor_bericht;
  if (Number.isFinite(kategorie.faktor_kontrolle)) updateData.faktor_kontrolle = kategorie.faktor_kontrolle;
  if (Number.isFinite(kategorie.faktor_abschluss)) updateData.faktor_abschluss = kategorie.faktor_abschluss;

  const { data, error } = await getSupabase()
    .from('kosten_kategorien')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteKategorie(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('kosten_kategorien')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// --- BASISWERTE ---

export async function getBasiswerte(): Promise<KostenBasiswerte> {
  const { data, error } = await getSupabase()
    .from('kosten_basiswerte')
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateBasiswerte(basiswerte: Partial<KostenBasiswerte>): Promise<KostenBasiswerte> {
  const { data, error } = await getSupabase()
    .from('kosten_basiswerte')
    .update(basiswerte)
    .eq('id', 1)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- OFFERTEN HISTORIE ---

export async function getOffertenListe(): Promise<Pick<OfferteHistorie, 'id' | 'offertnummer' | 'projekt_ort' | 'projekt_bezeichnung' | 'empfaenger_firma' | 'updated_at'>[]> {
  const { data, error } = await getSupabase()
    .from('offerten_historie')
    .select('id, offertnummer, projekt_ort, projekt_bezeichnung, empfaenger_firma, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getOfferte(offertnummer: string): Promise<OfferteHistorie | null> {
  const { data, error } = await getSupabase()
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
  const { data, error } = await getSupabase()
    .from('offerten_historie')
    .upsert(payload, { onConflict: 'offertnummer' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteOfferte(offertnummer: string): Promise<void> {
  const { error } = await getSupabase()
    .from('offerten_historie')
    .delete()
    .eq('offertnummer', offertnummer);

  if (error) throw error;
}

// --- APP EINSTELLUNGEN ---

export async function getEinstellungen(): Promise<AppEinstellungen> {
  const { data, error } = await getSupabase()
    .from('app_einstellungen')
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateEinstellungen(einstellungen: Partial<AppEinstellungen>): Promise<AppEinstellungen> {
  const { data, error } = await getSupabase()
    .from('app_einstellungen')
    .update(einstellungen)
    .eq('id', 1)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- STANDORTE ---

export async function getStandorte(): Promise<Standort[]> {
  const { data, error } = await getSupabase()
    .from('standorte')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateStandort(id: string, standort: Partial<Standort>): Promise<Standort> {
  const { data, error } = await getSupabase()
    .from('standorte')
    .update({
      name: standort.name,
      firma: standort.firma,
      strasse: standort.strasse,
      plz: standort.plz,
      ort: standort.ort,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
