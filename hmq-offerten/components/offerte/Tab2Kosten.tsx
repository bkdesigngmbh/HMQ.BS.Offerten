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
        const [kat, basis] = await Promise.all([
          getKategorien(),
          getBasiswerte(),
        ]);
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
            kostenBerechnung: {
              ...offerte.kostenBerechnung,
              kategorien: initialKategorien,
            },
          });
        }
      } catch (error) {
        console.error('Fehler beim Laden:', error);
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
      onChange({
        ...offerte,
        kosten: {
          ...offerte.kosten,
          leistungspreis: ergebnis.endpreis,
        },
      });
    }
  }, [ergebnis?.endpreis]);

  function handleKategorieChange(kategorieId: string, anzahl: number) {
    const newKategorien = offerte.kostenBerechnung.kategorien.map(k =>
      k.kategorieId === kategorieId ? { ...k, anzahl } : k
    );
    onChange({
      ...offerte,
      kostenBerechnung: {
        ...offerte.kostenBerechnung,
        kategorien: newKategorien,
      },
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

  function handleSpesenChange(field: keyof typeof offerte.kostenBerechnung.spesen, value: number) {
    onChange({
      ...offerte,
      kostenBerechnung: {
        ...offerte.kostenBerechnung,
        spesen: {
          ...offerte.kostenBerechnung.spesen,
          [field]: value,
        },
      },
    });
  }

  function handleRabattChange(rabattProzent: number) {
    onChange({
      ...offerte,
      kosten: {
        ...offerte.kosten,
        rabattProzent,
      },
    });
  }

  function formatCHF(amount: number): string {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Laden...</div>;
  }

  if (!basiswerte) {
    return <div className="p-8 text-center text-red-500">Fehler: Basiswerte nicht geladen</div>;
  }

  const rabattBetrag = ergebnis ? rundeAuf5Rappen(ergebnis.endpreis * (offerte.kosten.rabattProzent / 100)) : 0;
  const totalNachRabatt = ergebnis ? rundeAuf5Rappen(ergebnis.endpreis - rabattBetrag) : 0;

  return (
    <div className="space-y-8">
      {/* BEREICH 1: KATEGORIEN EINGABE */}
      <section className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">1. Objekte nach Kategorie</h3>
        <p className="text-sm text-gray-500 mb-4">
          Anzahl der zu dokumentierenden Objekte pro Kategorie eingeben.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {offerte.kostenBerechnung.kategorien.map((kat) => {
            const config = kategorienConfig.find(k => k.id === kat.kategorieId);
            return (
              <div key={kat.kategorieId} className="border rounded-lg p-3">
                <label className="block text-sm font-medium mb-1">{kat.titel}</label>
                {config?.beschreibung && (
                  <p className="text-xs text-gray-400 mb-2">{config.beschreibung}</p>
                )}
                <input
                  type="number"
                  min="0"
                  value={kat.anzahl || ''}
                  onChange={(e) => handleKategorieChange(kat.kategorieId, parseInt(e.target.value) || 0)}
                  className="w-full border rounded px-3 py-2 text-center"
                  placeholder="0"
                />
              </div>
            );
          })}
        </div>

        {ergebnis && (
          <div className="mt-4 pt-4 border-t flex justify-end">
            <div className="text-lg font-semibold">
              Total Objekte: <span className="text-blue-600">{ergebnis.totalN}</span>
            </div>
          </div>
        )}
      </section>

      {/* BEREICH 2: KOSTENBERECHNUNG */}
      {ergebnis && ergebnis.totalN > 0 && (
        <section className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">2. Kostenberechnung</h3>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span>1. {ergebnis.grundlagen.label}</span>
              <span className="font-mono">CHF {formatCHF(ergebnis.grundlagen.betrag)}</span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span>2. {ergebnis.termin.label}</span>
              <span className="font-mono">CHF {formatCHF(ergebnis.termin.betrag)}</span>
            </div>

            <div className="py-2 border-b">
              <div className="flex justify-between">
                <span>3. {ergebnis.aufnahme.label}</span>
                <span className="font-mono">CHF {formatCHF(ergebnis.aufnahme.betrag)}</span>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="text-gray-500">
                  Berechnet: {ergebnis.aufnahme.stundenRoh.toFixed(1)} Std.
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-gray-600">Override:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={offerte.kostenBerechnung.overrides.stundenEnd ?? ''}
                    onChange={(e) => handleOverrideChange('stundenEnd', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder={ergebnis.aufnahme.stundenRoh.toFixed(1)}
                    className="w-20 border rounded px-2 py-1 text-center text-sm"
                  />
                  <span className="text-gray-500">Std.</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span>4. {ergebnis.bericht.label}</span>
              <span className="font-mono">CHF {formatCHF(ergebnis.bericht.betrag)}</span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span>5. {ergebnis.kontrolle.label}</span>
              <span className="font-mono">CHF {formatCHF(ergebnis.kontrolle.betrag)}</span>
            </div>

            <div className="py-2 border-b">
              <div className="font-medium mb-2">6. Abschlussarbeiten</div>
              <div className="ml-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">6.1 {ergebnis.zustellbestaetigung.label}</span>
                  <span className="font-mono">CHF {formatCHF(ergebnis.zustellbestaetigung.betrag)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">6.2 {ergebnis.datenabgabe.label}</span>
                  <span className="font-mono">CHF {formatCHF(ergebnis.datenabgabe.betrag)}</span>
                </div>
              </div>
            </div>

            <div className="py-2 border-b">
              <div className="font-medium mb-2">7. Material</div>
              <div className="ml-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">7.1 {ergebnis.usb.label}</span>
                  <span className="font-mono">CHF {formatCHF(ergebnis.usb.betrag)}</span>
                </div>
                <div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">7.2 {ergebnis.binden.label}</span>
                    <span className="font-mono">CHF {formatCHF(ergebnis.binden.betrag)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-4">
                    <span className="text-gray-500">
                      Standard: {ergebnis.binden.mengeStandard} Stk.
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="text-gray-600">Override:</label>
                      <input
                        type="number"
                        min="0"
                        value={offerte.kostenBerechnung.overrides.bindemengeEnd ?? ''}
                        onChange={(e) => handleOverrideChange('bindemengeEnd', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder={ergebnis.binden.mengeStandard.toString()}
                        className="w-16 border rounded px-2 py-1 text-center text-sm"
                      />
                      <span className="text-gray-500">Stk.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="py-2 border-b">
              <div className="flex justify-between mb-2">
                <span className="font-medium">8. Spesen</span>
                <span className="font-mono">CHF {formatCHF(ergebnis.spesen.betrag)}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Kilometer</label>
                  <input
                    type="number"
                    min="0"
                    value={offerte.kostenBerechnung.spesen.kilometer || ''}
                    onChange={(e) => handleSpesenChange('kilometer', parseFloat(e.target.value) || 0)}
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Reisezeit (Std.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={offerte.kostenBerechnung.spesen.reisezeitStunden || ''}
                    onChange={(e) => handleSpesenChange('reisezeitStunden', parseFloat(e.target.value) || 0)}
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Verpflegung (Anz.)</label>
                  <input
                    type="number"
                    min="0"
                    value={offerte.kostenBerechnung.spesen.verpflegungAnzahl || ''}
                    onChange={(e) => handleSpesenChange('verpflegungAnzahl', parseInt(e.target.value) || 0)}
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Übernachtungen</label>
                  <input
                    type="number"
                    min="0"
                    value={offerte.kostenBerechnung.spesen.uebernachtungenAnzahl || ''}
                    onChange={(e) => handleSpesenChange('uebernachtungenAnzahl', parseInt(e.target.value) || 0)}
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between py-3 text-lg font-semibold">
              <span>Zwischentotal</span>
              <span className="font-mono">CHF {formatCHF(ergebnis.zwischentotal)}</span>
            </div>
          </div>
        </section>
      )}

      {/* BEREICH 3: ABSCHLUSS */}
      <section className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">3. Abschluss</h3>

        <div className="space-y-4">
          <div className="flex justify-between items-center py-2">
            <span>Leistungspreis exkl. MwSt.</span>
            <span className="text-xl font-mono font-semibold">
              CHF {formatCHF(offerte.kosten.leistungspreis)}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-t">
            <div className="flex items-center gap-3">
              <span>Rabatt</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={offerte.kosten.rabattProzent || ''}
                onChange={(e) => handleRabattChange(parseFloat(e.target.value) || 0)}
                className="w-20 border rounded px-2 py-1 text-center"
                placeholder="0"
              />
              <span>%</span>
            </div>
            {offerte.kosten.rabattProzent > 0 && (
              <span className="font-mono text-red-600">
                - CHF {formatCHF(rabattBetrag)}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center py-4 border-t bg-gray-50 -mx-6 px-6 -mb-6 rounded-b-lg">
            <span className="text-lg font-semibold">Total exkl. MwSt.</span>
            <span className="text-2xl font-mono font-bold text-blue-600">
              CHF {formatCHF(totalNachRabatt)}
            </span>
          </div>
        </div>
      </section>

      {ergebnis && ergebnis.totalN === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          Bitte mindestens eine Kategorie mit Anzahl &gt; 0 eingeben, um die Kosten zu berechnen.
        </div>
      )}
    </div>
  );
}
