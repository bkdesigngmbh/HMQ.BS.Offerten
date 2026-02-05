'use client';

import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from 'react';
import { Offerte, KategorieEingabe, GespeicherteKostenWerte } from '@/lib/types';
import { getKategorien, getBasiswerte, KostenKategorie, KostenBasiswerte } from '@/lib/supabase';
import { berechneKosten, KostenErgebnis, rundeAuf5Rappen } from '@/lib/kosten-rechner';

interface Tab2KostenProps {
  offerte: Offerte;
  onChange: (offerte: Offerte) => void;
}

// Editable price input component - MUST be outside the main component to prevent re-mounting
function EditablePreisInput({
  label,
  field,
  value,
  isChanged,
  onPreisChange
}: {
  label: string;
  field: string;
  value: number;
  isChanged: boolean;
  onPreisChange: (field: keyof EditablePreise, value: number) => void;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 group relative">
      <span className="text-gray-600 flex items-center gap-1.5">
        {label}
        {isChanged && (
          <span className="text-orange-500 text-xs font-medium">manuell</span>
        )}
      </span>
      <input
        type="number"
        min="0"
        step="0.05"
        value={value || ''}
        onChange={(e) => onPreisChange(field as keyof EditablePreise, parseFloat(e.target.value) || 0)}
        className={`w-24 px-2 py-1 text-right font-mono text-sm rounded-lg border-0
          ${isChanged ? 'bg-orange-50' : 'bg-gray-50'}
          focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all`}
        placeholder="0.00"
      />
    </div>
  );
}

// State für editierbare Preise
interface EditablePreise {
  grundlagen: number;
  termin: number;
  aufnahme: number;
  bericht: number;
  kontrolle: number;
  abschluss: number;
  material: number;
  spesen: number;
  zwischentotal: number;
}

export default function Tab2Kosten({ offerte, onChange }: Tab2KostenProps) {
  const [kategorienConfig, setKategorienConfig] = useState<KostenKategorie[]>([]);
  const [basiswerte, setBasiswerte] = useState<KostenBasiswerte | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [showPlanbeilage, setShowPlanbeilage] = useState(true);

  // Editierbare Preise - lokal im State
  const [editablePreise, setEditablePreise] = useState<EditablePreise>({
    grundlagen: 0,
    termin: 0,
    aufnahme: 0,
    bericht: 0,
    kontrolle: 0,
    abschluss: 0,
    material: 0,
    spesen: 0,
    zwischentotal: 0,
  });

  // Berechnete Preise zum Vergleich (für visuelle Kennzeichnung)
  const [berechnetePreise, setBerechnetePreise] = useState<EditablePreise>({
    grundlagen: 0,
    termin: 0,
    aufnahme: 0,
    bericht: 0,
    kontrolle: 0,
    abschluss: 0,
    material: 0,
    spesen: 0,
    zwischentotal: 0,
  });

  // Track welche Felder manuell geändert wurden
  const [manuallyChanged, setManuallyChanged] = useState<Set<keyof EditablePreise>>(new Set());

  // Track wenn Kategorien/Spesen geändert werden
  const prevKategorienRef = useRef<string>('');
  const prevSpesenRef = useRef<string>('');
  const prevOffertnummerRef = useRef<string>('');

  // Lade Konfiguration
  useEffect(() => {
    async function load() {
      try {
        const [kat, basis] = await Promise.all([getKategorien(), getBasiswerte()]);
        setKategorienConfig(kat);
        setBasiswerte(basis);

        // Merge: Gespeicherte Kategorien + neue Kategorien aus DB
        // Damit neue Kategorien auch bei bereits gespeicherten Offerten erscheinen
        const gespeicherteKategorien = offerte.kostenBerechnung.kategorien || [];

        // Kategorien nach Sortierung aus DB ordnen und mit gespeicherten mergen
        const gemergteKategorien: KategorieEingabe[] = kat
          .sort((a, b) => a.sortierung - b.sortierung)
          .map(dbKat => {
            // Suche ob diese Kategorie bereits in der gespeicherten Offerte existiert
            const gespeichert = gespeicherteKategorien.find(
              gk => gk.kategorieId === dbKat.id
            );

            if (gespeichert) {
              // Kategorie existiert -> übernehme gespeicherten Wert, aber aktuellen Titel
              return {
                kategorieId: dbKat.id,
                titel: dbKat.titel,
                anzahl: gespeichert.anzahl
              };
            } else {
              // Neue Kategorie -> mit 0 initialisieren
              return {
                kategorieId: dbKat.id,
                titel: dbKat.titel,
                anzahl: 0
              };
            }
          });

        // Updaten wenn sich was geändert hat (neue Kategorien oder Reihenfolge)
        const hatSichGeaendert =
          gemergteKategorien.length !== gespeicherteKategorien.length ||
          gemergteKategorien.some((gk, idx) =>
            gespeicherteKategorien[idx]?.kategorieId !== gk.kategorieId ||
            gespeicherteKategorien[idx]?.titel !== gk.titel
          );

        if (hatSichGeaendert) {
          onChange({
            ...offerte,
            kostenBerechnung: { ...offerte.kostenBerechnung, kategorien: gemergteKategorien },
          });
        }
      } catch (error) {
        console.error('Fehler:', error);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Berechne Kosten basierend auf aktuellen Eingaben
  const ergebnis: KostenErgebnis | null = useMemo(() => {
    if (!basiswerte || kategorienConfig.length === 0) return null;
    return berechneKosten(
      offerte.kostenBerechnung.kategorien,
      kategorienConfig,
      basiswerte,
      offerte.kostenBerechnung.overrides,
      offerte.kostenBerechnung.spesen
    );
  }, [offerte.kostenBerechnung, kategorienConfig, basiswerte]);

  // Initialisierung: Lade gespeicherte Werte oder berechne neu
  useEffect(() => {
    if (!ergebnis || !basiswerte || initialized) return;

    const gespeichert = offerte.kostenBerechnung.gespeicherteWerte;

    if (gespeichert) {
      // Lade gespeicherte Werte
      const geladenePreise: EditablePreise = {
        grundlagen: gespeichert.grundlagen,
        termin: gespeichert.termin,
        aufnahme: gespeichert.aufnahme,
        bericht: gespeichert.bericht,
        kontrolle: gespeichert.kontrolle,
        abschluss: gespeichert.abschluss,
        material: gespeichert.material,
        spesen: gespeichert.spesen,
        zwischentotal: gespeichert.zwischentotal,
      };
      setEditablePreise(geladenePreise);

      // Berechnete Werte für Vergleich
      const berechnete: EditablePreise = {
        grundlagen: ergebnis.grundlagen.betrag,
        termin: ergebnis.termin.betrag,
        aufnahme: ergebnis.aufnahme.betrag,
        bericht: ergebnis.bericht.betrag,
        kontrolle: ergebnis.kontrolle.betrag,
        abschluss: ergebnis.zustellbestaetigung.betrag + ergebnis.datenabgabe.betrag,
        material: ergebnis.usb.betrag + ergebnis.binden.betrag,
        spesen: ergebnis.spesen.betrag,
        zwischentotal: ergebnis.endpreis,
      };
      setBerechnetePreise(berechnete);

      // Markiere welche Werte abweichen
      const changedFields = new Set<keyof EditablePreise>();
      (Object.keys(geladenePreise) as (keyof EditablePreise)[]).forEach(key => {
        if (Math.abs(geladenePreise[key] - berechnete[key]) >= 0.01) {
          changedFields.add(key);
        }
      });
      setManuallyChanged(changedFields);
    } else {
      // Keine gespeicherten Werte - berechne frisch
      const neuePreise: EditablePreise = {
        grundlagen: ergebnis.grundlagen.betrag,
        termin: ergebnis.termin.betrag,
        aufnahme: ergebnis.aufnahme.betrag,
        bericht: ergebnis.bericht.betrag,
        kontrolle: ergebnis.kontrolle.betrag,
        abschluss: ergebnis.zustellbestaetigung.betrag + ergebnis.datenabgabe.betrag,
        material: ergebnis.usb.betrag + ergebnis.binden.betrag,
        spesen: ergebnis.spesen.betrag,
        zwischentotal: ergebnis.endpreis,
      };
      setEditablePreise(neuePreise);
      setBerechnetePreise(neuePreise);
      setManuallyChanged(new Set());
    }

    prevKategorienRef.current = JSON.stringify(offerte.kostenBerechnung.kategorien);
    prevSpesenRef.current = JSON.stringify(offerte.kostenBerechnung.spesen);
    prevOffertnummerRef.current = offerte.offertnummer;
    setInitialized(true);
  }, [ergebnis, basiswerte, initialized, offerte.kostenBerechnung.gespeicherteWerte]);

  // Bei Wechsel der Offerte: Reset
  useEffect(() => {
    if (prevOffertnummerRef.current !== '' && prevOffertnummerRef.current !== offerte.offertnummer) {
      setInitialized(false);
      setManuallyChanged(new Set());
    }
  }, [offerte.offertnummer]);

  // Wenn Kategorien oder Spesen geändert werden -> alle Preise neu berechnen
  useEffect(() => {
    if (!ergebnis || !initialized) return;

    const kategorienStr = JSON.stringify(offerte.kostenBerechnung.kategorien);
    const spesenStr = JSON.stringify(offerte.kostenBerechnung.spesen);

    const kategorienChanged = prevKategorienRef.current !== '' && prevKategorienRef.current !== kategorienStr;
    const spesenChanged = prevSpesenRef.current !== '' && prevSpesenRef.current !== spesenStr;

    if (kategorienChanged || spesenChanged) {
      // Komplette Neuberechnung - alle manuellen Änderungen gehen verloren
      const neuePreise: EditablePreise = {
        grundlagen: ergebnis.grundlagen.betrag,
        termin: ergebnis.termin.betrag,
        aufnahme: ergebnis.aufnahme.betrag,
        bericht: ergebnis.bericht.betrag,
        kontrolle: ergebnis.kontrolle.betrag,
        abschluss: ergebnis.zustellbestaetigung.betrag + ergebnis.datenabgabe.betrag,
        material: ergebnis.usb.betrag + ergebnis.binden.betrag,
        spesen: ergebnis.spesen.betrag,
        zwischentotal: ergebnis.endpreis,
      };
      setEditablePreise(neuePreise);
      setBerechnetePreise(neuePreise);
      setManuallyChanged(new Set());

      // Overrides zurücksetzen
      onChange({
        ...offerte,
        kostenBerechnung: {
          ...offerte.kostenBerechnung,
          overrides: { stundenEnd: null, bindemengeEnd: null },
          gespeicherteWerte: undefined, // Alte gespeicherte Werte löschen
        },
      });
    }

    prevKategorienRef.current = kategorienStr;
    prevSpesenRef.current = spesenStr;
  }, [ergebnis, offerte.kostenBerechnung.kategorien, offerte.kostenBerechnung.spesen, initialized]);

  // Update offerte.kosten.leistungspreis wenn Zwischentotal geändert wird
  useEffect(() => {
    if (editablePreise.zwischentotal !== offerte.kosten.leistungspreis && initialized) {
      onChange({ ...offerte, kosten: { ...offerte.kosten, leistungspreis: editablePreise.zwischentotal } });
    }
  }, [editablePreise.zwischentotal, initialized]);

  // Speichere aktuelle Werte als gespeicherteWerte wenn sich editablePreise ändert
  const updateGespeicherteWerte = useCallback(() => {
    if (!basiswerte || !ergebnis || !initialized) return;

    const rabattBetrag = rundeAuf5Rappen(editablePreise.zwischentotal * (offerte.kosten.rabattProzent / 100));
    const totalNachRabatt = rundeAuf5Rappen(editablePreise.zwischentotal - rabattBetrag);
    const mwstBetrag = rundeAuf5Rappen(totalNachRabatt * 0.081);
    const totalInklMwst = rundeAuf5Rappen(totalNachRabatt + mwstBetrag);

    const gespeicherteWerte: GespeicherteKostenWerte = {
      grundlagen: editablePreise.grundlagen,
      termin: editablePreise.termin,
      aufnahme: editablePreise.aufnahme,
      aufnahmeStunden: ergebnis.aufnahme.stundenEnd,
      bericht: editablePreise.bericht,
      kontrolle: editablePreise.kontrolle,
      abschluss: editablePreise.abschluss,
      material: editablePreise.material,
      materialUsbKosten: basiswerte.usb_pauschal,
      materialBindeAnzahl: ergebnis.binden.mengeEnd,
      materialBindeKosten: ergebnis.binden.betrag,
      spesen: editablePreise.spesen,
      zwischentotal: editablePreise.zwischentotal,
      rabattProzent: offerte.kosten.rabattProzent,
      rabattBetrag,
      mwstBetrag,
      totalInklMwst,
    };

    // Nur updaten wenn sich Werte geändert haben
    const current = offerte.kostenBerechnung.gespeicherteWerte;
    if (JSON.stringify(current) !== JSON.stringify(gespeicherteWerte)) {
      onChange({
        ...offerte,
        kostenBerechnung: {
          ...offerte.kostenBerechnung,
          gespeicherteWerte,
        },
      });
    }
  }, [editablePreise, offerte.kosten.rabattProzent, basiswerte, ergebnis, initialized]);

  // Debounced Update der gespeicherten Werte
  useEffect(() => {
    if (!initialized) return;
    const timeout = setTimeout(updateGespeicherteWerte, 300);
    return () => clearTimeout(timeout);
  }, [editablePreise, offerte.kosten.rabattProzent, updateGespeicherteWerte, initialized]);

  function handleKategorieChange(kategorieId: string, anzahl: number) {
    const newKategorien = offerte.kostenBerechnung.kategorien.map(k =>
      k.kategorieId === kategorieId ? { ...k, anzahl } : k
    );
    onChange({ ...offerte, kostenBerechnung: { ...offerte.kostenBerechnung, kategorien: newKategorien } });
  }

  function handleSpesenChange(field: keyof typeof offerte.kostenBerechnung.spesen, value: number) {
    onChange({
      ...offerte,
      kostenBerechnung: { ...offerte.kostenBerechnung, spesen: { ...offerte.kostenBerechnung.spesen, [field]: value } },
    });
  }

  // Override für Stunden - aktualisiert auch Aufnahme-Preis
  function handleStundenOverride(value: number | null) {
    if (!basiswerte) return;

    // Override setzen
    const newOverrides = {
      ...offerte.kostenBerechnung.overrides,
      stundenEnd: value,
    };

    onChange({
      ...offerte,
      kostenBerechnung: {
        ...offerte.kostenBerechnung,
        overrides: newOverrides,
      },
    });

    // Wenn Override gesetzt, Aufnahme-Preis neu berechnen
    if (value !== null) {
      const neuerAufnahmePreis = rundeAuf5Rappen(value * basiswerte.stundensatz_aufnahme);
      setEditablePreise(prev => {
        const updated = { ...prev, aufnahme: neuerAufnahmePreis };
        updated.zwischentotal = rundeAuf5Rappen(
          updated.grundlagen + updated.termin + updated.aufnahme +
          updated.bericht + updated.kontrolle + updated.abschluss +
          updated.material + updated.spesen
        );
        return updated;
      });
      setManuallyChanged(prev => new Set([...prev, 'aufnahme']));
    }
  }

  // Override für Bindemenge - aktualisiert auch Material-Preis
  function handleBindemengeOverride(value: number | null) {
    if (!basiswerte) return;

    // Override setzen
    const newOverrides = {
      ...offerte.kostenBerechnung.overrides,
      bindemengeEnd: value,
    };

    onChange({
      ...offerte,
      kostenBerechnung: {
        ...offerte.kostenBerechnung,
        overrides: newOverrides,
      },
    });

    // Wenn Override gesetzt, Material-Preis neu berechnen
    if (value !== null) {
      const neueBindeKosten = rundeAuf5Rappen(value * basiswerte.binden_einheitspreis);
      const neuerMaterialPreis = rundeAuf5Rappen(basiswerte.usb_pauschal + neueBindeKosten);
      setEditablePreise(prev => {
        const updated = { ...prev, material: neuerMaterialPreis };
        updated.zwischentotal = rundeAuf5Rappen(
          updated.grundlagen + updated.termin + updated.aufnahme +
          updated.bericht + updated.kontrolle + updated.abschluss +
          updated.material + updated.spesen
        );
        return updated;
      });
      setManuallyChanged(prev => new Set([...prev, 'material']));
    }
  }

  function handleRabattChange(rabattProzent: number) {
    onChange({ ...offerte, kosten: { ...offerte.kosten, rabattProzent } });
  }

  const handlePreisChange = useCallback((field: keyof EditablePreise, value: number) => {
    const rounded = rundeAuf5Rappen(value);
    setEditablePreise(prev => {
      const updated = { ...prev, [field]: rounded };
      // Wenn eine Position geändert wird, berechne Zwischentotal neu
      if (field !== 'zwischentotal') {
        updated.zwischentotal = rundeAuf5Rappen(
          updated.grundlagen + updated.termin + updated.aufnahme +
          updated.bericht + updated.kontrolle + updated.abschluss +
          updated.material + updated.spesen
        );
      }
      return updated;
    });
    setManuallyChanged(prev => new Set([...prev, field]));
  }, []);

  function getBeschreibungForKategorie(kategorieId: string): string | undefined {
    const kat = kategorienConfig.find(k => k.id === kategorieId);
    return kat?.beschreibung ?? undefined;
  }

  function formatCHF(amount: number): string {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  }

  // Prüft ob ein Wert manuell geändert wurde
  function isManuallyChanged(field: keyof EditablePreise): boolean {
    return manuallyChanged.has(field);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-[#1e3a5f] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const rabattBetrag = rundeAuf5Rappen(editablePreise.zwischentotal * (offerte.kosten.rabattProzent / 100));
  const totalNachRabatt = rundeAuf5Rappen(editablePreise.zwischentotal - rabattBetrag);
  const mwstBetrag = rundeAuf5Rappen(totalNachRabatt * 0.081); // 8.1% MwSt.
  const totalInklMwst = rundeAuf5Rappen(totalNachRabatt + mwstBetrag);

  const inputClass = "w-full px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm text-center focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all";

  return (
    <div className="space-y-6">
      {/* Planbeilage Vorschau (wenn vorhanden) */}
      {offerte.planbeilage && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowPlanbeilage(!showPlanbeilage)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Planbeilage (Situationsplan)</h3>
                <p className="text-sm text-gray-500">Zur Unterstützung beim Ausfüllen der Kosten</p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${showPlanbeilage ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showPlanbeilage && (
            <div className="px-6 pb-6">
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                <img
                  src={offerte.planbeilage.base64.startsWith('data:')
                    ? offerte.planbeilage.base64
                    : `data:${offerte.planbeilage.mimeType};base64,${offerte.planbeilage.base64}`}
                  alt={offerte.planbeilage.dateiname}
                  className="w-full h-auto max-h-[600px] object-contain"
                />
              </div>
              {offerte.planbeilageGisLink && (
                <a
                  href={offerte.planbeilageGisLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 text-sm text-[#1e3a5f] hover:text-[#166ab8] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  GIS-Link öffnen
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hauptbereich: Kategorien, Spesen, Kostenübersicht */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Spalte 1+2: Kategorien & Spesen */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          Objekte nach Kategorie
        </h3>

        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {offerte.kostenBerechnung.kategorien.map((kat) => {
            const beschreibung = getBeschreibungForKategorie(kat.kategorieId);
            return (
              <div key={kat.kategorieId} className="bg-gray-50 rounded-lg p-2">
                <div className="flex justify-between items-start mb-1.5">
                  <label className="text-xs font-medium text-gray-600 leading-tight">{kat.titel}</label>
                  <div className="group relative flex-shrink-0 ml-1">
                    <svg className="w-3.5 h-3.5 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="hidden group-hover:block absolute right-0 top-4 bg-gray-900 text-white text-xs p-2 rounded-lg w-48 z-10 shadow-lg">
                      {beschreibung || 'Keine Beschreibung hinterlegt'}
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  value={kat.anzahl || ''}
                  onChange={(e) => handleKategorieChange(kat.kategorieId, parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-white border-0 rounded-md text-sm text-center focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
                  placeholder="0"
                />
              </div>
            );
          })}
        </div>

        {ergebnis && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
            <span className="text-sm text-gray-500">
              Total Objekte: <span className="font-semibold text-[#1e3a5f]">{ergebnis.totalN}</span>
            </span>
          </div>
        )}

        {/* Einsatzpauschalen & Spesen kombiniert */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Einsätze & Spesen</h4>
          <div className="grid grid-cols-5 gap-2">
            <div className="bg-gray-50 rounded-lg p-2">
              <label className="block text-xs text-gray-500 mb-1.5">Einsätze</label>
              <select
                value={offerte.einsatzpauschalen.toString()}
                onChange={(e) => onChange({ ...offerte, einsatzpauschalen: parseInt(e.target.value) })}
                className="w-full px-2 py-1.5 bg-white border-0 rounded-md text-sm text-center focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <label className="block text-xs text-gray-500 mb-1.5">Kilometer</label>
              <input
                type="number"
                min="0"
                value={offerte.kostenBerechnung.spesen.kilometer || ''}
                onChange={(e) => handleSpesenChange('kilometer', parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-white border-0 rounded-md text-sm text-center focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
                placeholder="0"
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <label className="block text-xs text-gray-500 mb-1.5">Reisezeit</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={offerte.kostenBerechnung.spesen.reisezeitStunden || ''}
                onChange={(e) => handleSpesenChange('reisezeitStunden', parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-white border-0 rounded-md text-sm text-center focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
                placeholder="0"
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <label className="block text-xs text-gray-500 mb-1.5">Verpflegung</label>
              <input
                type="number"
                min="0"
                value={offerte.kostenBerechnung.spesen.verpflegungAnzahl || ''}
                onChange={(e) => handleSpesenChange('verpflegungAnzahl', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-white border-0 rounded-md text-sm text-center focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
                placeholder="0"
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <label className="block text-xs text-gray-500 mb-1.5">Übernachtung</label>
              <input
                type="number"
                min="0"
                value={offerte.kostenBerechnung.spesen.uebernachtungenAnzahl || ''}
                onChange={(e) => handleSpesenChange('uebernachtungenAnzahl', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-white border-0 rounded-md text-sm text-center focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Manuelle Korrekturen */}
        {ergebnis && ergebnis.totalN > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Manuelle Korrekturen (optional)</h4>
            <p className="text-xs text-gray-500 mb-3">Änderungen hier aktualisieren automatisch die Preise rechts</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <label className="block text-xs text-amber-700 mb-1">
                  Stunden Aufnahme
                </label>
                <span className="text-xs text-amber-500 block mb-2">
                  berechnet: {ergebnis.aufnahme.stundenRoh.toFixed(1)} Std. → {ergebnis.aufnahme.stundenEnd.toFixed(1)} Std.
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={offerte.kostenBerechnung.overrides.stundenEnd ?? ''}
                  onChange={(e) => handleStundenOverride(e.target.value ? parseFloat(e.target.value) : null)}
                  className={`${inputClass} bg-white border border-amber-200`}
                  placeholder="Auto"
                />
              </div>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <label className="block text-xs text-amber-700 mb-1">
                  Bindemenge (Stk)
                </label>
                <span className="text-xs text-amber-500 block mb-2">
                  berechnet: {ergebnis.binden.mengeStandard} Stk. (1 pro Objekt)
                </span>
                <input
                  type="number"
                  min="0"
                  value={offerte.kostenBerechnung.overrides.bindemengeEnd ?? ''}
                  onChange={(e) => handleBindemengeOverride(e.target.value ? parseInt(e.target.value) : null)}
                  className={`${inputClass} bg-white border border-amber-200`}
                  placeholder="Auto"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spalte 3: Zusammenfassung */}
      <div className="space-y-4">
        {/* Kostenübersicht - editierbar */}
        {ergebnis && ergebnis.totalN > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Kostenübersicht</h3>
              <span
                className="text-xs text-gray-400 cursor-help"
                title="Alle Preise sind editierbar. Änderungen werden bei Anpassung der Kategorien oder Spesen zurückgesetzt."
              >
                editierbar
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <EditablePreisInput label="Grundlagen" field="grundlagen" value={editablePreise.grundlagen} isChanged={isManuallyChanged('grundlagen')} onPreisChange={handlePreisChange} />
              <EditablePreisInput label="Termin" field="termin" value={editablePreise.termin} isChanged={isManuallyChanged('termin')} onPreisChange={handlePreisChange} />
              <EditablePreisInput label="Aufnahme" field="aufnahme" value={editablePreise.aufnahme} isChanged={isManuallyChanged('aufnahme')} onPreisChange={handlePreisChange} />
              <EditablePreisInput label="Bericht" field="bericht" value={editablePreise.bericht} isChanged={isManuallyChanged('bericht')} onPreisChange={handlePreisChange} />
              <EditablePreisInput label="Kontrolle" field="kontrolle" value={editablePreise.kontrolle} isChanged={isManuallyChanged('kontrolle')} onPreisChange={handlePreisChange} />
              <EditablePreisInput label="Abschluss" field="abschluss" value={editablePreise.abschluss} isChanged={isManuallyChanged('abschluss')} onPreisChange={handlePreisChange} />
              <EditablePreisInput label="Material" field="material" value={editablePreise.material} isChanged={isManuallyChanged('material')} onPreisChange={handlePreisChange} />
              <EditablePreisInput label="Spesen" field="spesen" value={editablePreise.spesen} isChanged={isManuallyChanged('spesen')} onPreisChange={handlePreisChange} />
            </div>
          </div>
        )}

        {/* Total - dunkelblauerBlock */}
        <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] rounded-2xl p-6 text-white">
          {/* Zwischentotal - editierbar */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 flex items-center gap-1.5">
              Zwischentotal
              {isManuallyChanged('zwischentotal') && (
                <span className="text-orange-300 text-xs">manuell</span>
              )}
            </span>
            <input
              type="number"
              min="0"
              step="0.05"
              value={editablePreise.zwischentotal || ''}
              onChange={(e) => handlePreisChange('zwischentotal', parseFloat(e.target.value) || 0)}
              className={`w-28 px-2 py-1 rounded-lg text-sm text-right font-mono
                ${isManuallyChanged('zwischentotal') ? 'bg-orange-400/30' : 'bg-white/20'}
                border-0 text-white placeholder-white/50 focus:bg-white/30 focus:ring-0`}
              placeholder="0.00"
            />
          </div>

          {/* Rabatt */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80">Rabatt</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={offerte.kosten.rabattProzent || ''}
                onChange={(e) => handleRabattChange(parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1 bg-white/20 border-0 rounded-lg text-sm text-center text-white placeholder-white/50 focus:bg-white/30 focus:ring-0"
                placeholder="0"
              />
              <span>%</span>
              {offerte.kosten.rabattProzent > 0 && (
                <span className="text-white/60 text-sm">(-{formatCHF(rabattBetrag)})</span>
              )}
            </div>
          </div>

          {/* Trennlinie */}
          <div className="border-t border-white/20 my-4"></div>

          {/* Total inkl. MwSt. */}
          <div className="flex justify-between items-center">
            <div>
              <span className="text-lg font-medium">Total inkl. MwSt.</span>
              <div className="text-white/60 text-xs">inkl. 8.1% MwSt. ({formatCHF(mwstBetrag)})</div>
            </div>
            <span className="text-2xl font-bold font-mono">
              CHF {formatCHF(totalInklMwst)}
            </span>
          </div>
        </div>

        {(!ergebnis || ergebnis.totalN === 0) && (
          <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
            Wählen Sie mindestens eine Kategorie mit Anzahl &gt; 0
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
