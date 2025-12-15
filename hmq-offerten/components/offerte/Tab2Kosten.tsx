'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Offerte, KategorieEingabe } from '@/lib/types';
import { getKategorien, getBasiswerte, KostenKategorie, KostenBasiswerte } from '@/lib/supabase';
import { berechneKosten, KostenErgebnis, rundeAuf5Rappen } from '@/lib/kosten-rechner';

interface Tab2KostenProps {
  offerte: Offerte;
  onChange: (offerte: Offerte) => void;
}

// State für editierbare Preise (werden bei Neuberechnung überschrieben)
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

  // Track wenn Kategorien/Spesen geändert werden
  const prevKategorienRef = useRef<string>('');
  const prevSpesenRef = useRef<string>('');

  useEffect(() => {
    async function load() {
      try {
        const [kat, basis] = await Promise.all([getKategorien(), getBasiswerte()]);
        setKategorienConfig(kat);
        setBasiswerte(basis);

        if (offerte.kostenBerechnung.kategorien.length === 0 && kat.length > 0) {
          const initialKategorien: KategorieEingabe[] = kat.map(k => ({
            kategorieId: k.id,
            titel: k.titel,
            anzahl: 0,
          }));
          onChange({
            ...offerte,
            kostenBerechnung: { ...offerte.kostenBerechnung, kategorien: initialKategorien },
          });
        }
      } catch (error) {
        console.error('Fehler:', error);
      }
      setLoading(false);
    }
    load();
  }, []);

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

  // Wenn Kategorien oder Spesen geändert werden -> alle Preise neu berechnen
  useEffect(() => {
    const kategorienStr = JSON.stringify(offerte.kostenBerechnung.kategorien);
    const spesenStr = JSON.stringify(offerte.kostenBerechnung.spesen);

    const kategorienChanged = prevKategorienRef.current !== '' && prevKategorienRef.current !== kategorienStr;
    const spesenChanged = prevSpesenRef.current !== '' && prevSpesenRef.current !== spesenStr;

    if (ergebnis && (kategorienChanged || spesenChanged || prevKategorienRef.current === '')) {
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
    }

    prevKategorienRef.current = kategorienStr;
    prevSpesenRef.current = spesenStr;
  }, [ergebnis, offerte.kostenBerechnung.kategorien, offerte.kostenBerechnung.spesen]);

  // Update offerte.kosten.leistungspreis wenn Zwischentotal geändert wird
  useEffect(() => {
    if (editablePreise.zwischentotal !== offerte.kosten.leistungspreis) {
      onChange({ ...offerte, kosten: { ...offerte.kosten, leistungspreis: editablePreise.zwischentotal } });
    }
  }, [editablePreise.zwischentotal]);

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

  function handleOverrideChange(field: 'stundenEnd' | 'bindemengeEnd', value: number | null) {
    onChange({
      ...offerte,
      kostenBerechnung: {
        ...offerte.kostenBerechnung,
        overrides: {
          ...offerte.kostenBerechnung.overrides,
          [field]: value,
        },
      },
    });
  }

  function handleRabattChange(rabattProzent: number) {
    onChange({ ...offerte, kosten: { ...offerte.kosten, rabattProzent } });
  }

  function handlePreisChange(field: keyof EditablePreise, value: number) {
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
  }

  function getBeschreibungForKategorie(kategorieId: string): string | undefined {
    const kat = kategorienConfig.find(k => k.id === kategorieId);
    return kat?.beschreibung ?? undefined;
  }

  function formatCHF(amount: number): string {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  }

  // Prüft ob ein Wert manuell geändert wurde
  function isManuallyChanged(field: keyof EditablePreise): boolean {
    return Math.abs(editablePreise[field] - berechnetePreise[field]) >= 0.01;
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

  const inputClass = "w-full px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm text-center focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all";

  // Editable price input component with manual change indicator
  const EditablePreisInput = ({
    label,
    field,
    value
  }: {
    label: string;
    field: keyof EditablePreise;
    value: number;
  }) => {
    const isChanged = isManuallyChanged(field);
    return (
      <div className="flex justify-between items-center py-1.5 group relative">
        <span className="text-gray-600 flex items-center gap-1.5">
          {label}
          {isChanged && (
            <span
              className="w-2 h-2 bg-orange-400 rounded-full cursor-help"
              title="Manuell angepasst - wird bei Änderung der Kategorien zurückgesetzt"
            />
          )}
        </span>
        <input
          type="number"
          min="0"
          step="0.05"
          value={value || ''}
          onChange={(e) => handlePreisChange(field, parseFloat(e.target.value) || 0)}
          className={`w-24 px-2 py-1 text-right font-mono text-sm rounded-lg border-0
            ${isChanged ? 'bg-orange-50' : 'bg-gray-50'}
            focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all`}
          placeholder="0.00"
        />
      </div>
    );
  };

  return (
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {offerte.kostenBerechnung.kategorien.map((kat) => {
            const beschreibung = getBeschreibungForKategorie(kat.kategorieId);
            return (
              <div key={kat.kategorieId} className="bg-gray-50 rounded-xl p-3">
                <div className="flex justify-between items-start mb-2">
                  <label className="text-xs font-medium text-gray-600">{kat.titel}</label>
                  <div className="group relative">
                    <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="hidden group-hover:block absolute right-0 top-5 bg-gray-900 text-white text-xs p-2 rounded-lg w-48 z-10 shadow-lg">
                      {beschreibung || 'Keine Beschreibung hinterlegt'}
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  value={kat.anzahl || ''}
                  onChange={(e) => handleKategorieChange(kat.kategorieId, parseInt(e.target.value) || 0)}
                  className={inputClass}
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

        {/* Spesen */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Spesen</h4>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <label className="block text-xs text-gray-500 mb-2">Kilometer</label>
              <input
                type="number"
                min="0"
                value={offerte.kostenBerechnung.spesen.kilometer || ''}
                onChange={(e) => handleSpesenChange('kilometer', parseFloat(e.target.value) || 0)}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <label className="block text-xs text-gray-500 mb-2">Reisezeit (Std)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={offerte.kostenBerechnung.spesen.reisezeitStunden || ''}
                onChange={(e) => handleSpesenChange('reisezeitStunden', parseFloat(e.target.value) || 0)}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <label className="block text-xs text-gray-500 mb-2">Verpflegung</label>
              <input
                type="number"
                min="0"
                value={offerte.kostenBerechnung.spesen.verpflegungAnzahl || ''}
                onChange={(e) => handleSpesenChange('verpflegungAnzahl', parseInt(e.target.value) || 0)}
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <label className="block text-xs text-gray-500 mb-2">Übernachtung</label>
              <input
                type="number"
                min="0"
                value={offerte.kostenBerechnung.spesen.uebernachtungenAnzahl || ''}
                onChange={(e) => handleSpesenChange('uebernachtungenAnzahl', parseInt(e.target.value) || 0)}
                className={inputClass}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Manuelle Korrekturen */}
        {ergebnis && ergebnis.totalN > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Manuelle Korrekturen (optional)</h4>
            <p className="text-xs text-gray-500 mb-3">Überschreiben Sie die berechneten Werte, falls nötig</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <label className="block text-xs text-amber-700 mb-2">
                  Stunden Aufnahme
                  {ergebnis && <span className="text-amber-500 ml-1">(berechnet: {ergebnis.aufnahme.stundenRoh.toFixed(1)})</span>}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={offerte.kostenBerechnung.overrides.stundenEnd ?? ''}
                  onChange={(e) => handleOverrideChange('stundenEnd', e.target.value ? parseFloat(e.target.value) : null)}
                  className={`${inputClass} bg-white border border-amber-200`}
                  placeholder="Auto"
                />
              </div>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <label className="block text-xs text-amber-700 mb-2">
                  Bindemenge (Stk)
                  {ergebnis && <span className="text-amber-500 ml-1">(berechnet: {ergebnis.binden.mengeStandard})</span>}
                </label>
                <input
                  type="number"
                  min="0"
                  value={offerte.kostenBerechnung.overrides.bindemengeEnd ?? ''}
                  onChange={(e) => handleOverrideChange('bindemengeEnd', e.target.value ? parseInt(e.target.value) : null)}
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
              <EditablePreisInput label="Grundlagen" field="grundlagen" value={editablePreise.grundlagen} />
              <EditablePreisInput label="Termin" field="termin" value={editablePreise.termin} />
              <EditablePreisInput label="Aufnahme" field="aufnahme" value={editablePreise.aufnahme} />
              <EditablePreisInput label="Bericht" field="bericht" value={editablePreise.bericht} />
              <EditablePreisInput label="Kontrolle" field="kontrolle" value={editablePreise.kontrolle} />
              <EditablePreisInput label="Abschluss" field="abschluss" value={editablePreise.abschluss} />
              <EditablePreisInput label="Material" field="material" value={editablePreise.material} />
              <EditablePreisInput label="Spesen" field="spesen" value={editablePreise.spesen} />
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
                <span
                  className="w-2 h-2 bg-orange-400 rounded-full cursor-help"
                  title="Manuell angepasst - wird bei Änderung der Kategorien zurückgesetzt"
                />
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
            </div>
          </div>

          {offerte.kosten.rabattProzent > 0 && (
            <div className="flex justify-between text-sm mb-3 text-white/80">
              <span>Rabatt-Betrag</span>
              <span>- CHF {formatCHF(rabattBetrag)}</span>
            </div>
          )}

          <div className="pt-4 border-t border-white/20">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Total exkl. MwSt.</span>
              <span className="text-2xl font-bold font-mono">
                CHF {formatCHF(totalNachRabatt)}
              </span>
            </div>
          </div>
        </div>

        {(!ergebnis || ergebnis.totalN === 0) && (
          <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
            Wählen Sie mindestens eine Kategorie mit Anzahl &gt; 0
          </div>
        )}
      </div>
    </div>
  );
}
