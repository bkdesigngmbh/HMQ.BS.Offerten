'use client';

import { useState, useEffect, useMemo } from 'react';
import { Offerte, KategorieEingabe } from '@/lib/types';
import { getKategorien, getBasiswerte, KostenKategorie, KostenBasiswerte } from '@/lib/supabase';
import { berechneKosten, KostenErgebnis, rundeAuf5Rappen } from '@/lib/kosten-rechner';

interface Tab2KostenProps {
  offerte: Offerte;
  onChange: (offerte: Offerte) => void;
}

export default function Tab2Kosten({ offerte, onChange }: Tab2KostenProps) {
  const [kategorienConfig, setKategorienConfig] = useState<KostenKategorie[]>([]);
  const [basiswerte, setBasiswerte] = useState<KostenBasiswerte | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (ergebnis && ergebnis.endpreis !== offerte.kosten.leistungspreis) {
      onChange({ ...offerte, kosten: { ...offerte.kosten, leistungspreis: ergebnis.endpreis } });
    }
  }, [ergebnis?.endpreis]);

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

  function formatCHF(amount: number): string {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-[#1e3a5f] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const rabattBetrag = ergebnis ? rundeAuf5Rappen(ergebnis.endpreis * (offerte.kosten.rabattProzent / 100)) : 0;
  const totalNachRabatt = ergebnis ? rundeAuf5Rappen(ergebnis.endpreis - rabattBetrag) : 0;

  const inputClass = "w-full px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm text-center focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all";

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
          {offerte.kostenBerechnung.kategorien.map((kat) => (
            <div key={kat.kategorieId} className="bg-gray-50 rounded-xl p-3">
              <label className="block text-xs font-medium text-gray-600 mb-2">{kat.titel}</label>
              <input
                type="number"
                min="0"
                value={kat.anzahl || ''}
                onChange={(e) => handleKategorieChange(kat.kategorieId, parseInt(e.target.value) || 0)}
                className={inputClass}
                placeholder="0"
              />
            </div>
          ))}
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
        {/* Kostenübersicht */}
        {ergebnis && ergebnis.totalN > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Kostenübersicht</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5">
                <span className="text-gray-600">Grundlagen</span>
                <span className="font-mono">{formatCHF(ergebnis.grundlagen.betrag)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-600">Termin</span>
                <span className="font-mono">{formatCHF(ergebnis.termin.betrag)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-600">Aufnahme</span>
                <span className="font-mono">{formatCHF(ergebnis.aufnahme.betrag)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-600">Bericht</span>
                <span className="font-mono">{formatCHF(ergebnis.bericht.betrag)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-600">Kontrolle</span>
                <span className="font-mono">{formatCHF(ergebnis.kontrolle.betrag)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-600">Abschluss</span>
                <span className="font-mono">{formatCHF(ergebnis.zustellbestaetigung.betrag + ergebnis.datenabgabe.betrag)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-600">Material</span>
                <span className="font-mono">{formatCHF(ergebnis.usb.betrag + ergebnis.binden.betrag)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-600">Spesen</span>
                <span className="font-mono">{formatCHF(ergebnis.spesen.betrag)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
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
            <div className="flex justify-between text-sm mb-2 text-white/80">
              <span>Rabatt</span>
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
