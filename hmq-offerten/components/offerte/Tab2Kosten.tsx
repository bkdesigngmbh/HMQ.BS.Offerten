'use client';

import { useState, useEffect, useMemo } from 'react';
import { Offerte, KategorieEingabe } from '@/lib/types';
import { getKategorien, getBasiswerte, KostenKategorie, KostenBasiswerte } from '@/lib/supabase';
import { berechneKosten, KostenErgebnis, rundeAuf5Rappen } from '@/lib/kosten-rechner';

interface Tab2KostenProps {
  offerte: Offerte;
  onChange: (offerte: Offerte) => void;
  errors: Record<string, string>;
}

export default function Tab2Kosten({ offerte, onChange, errors }: Tab2KostenProps) {
  // Supabase Daten
  const [kategorienConfig, setKategorienConfig] = useState<KostenKategorie[]>([]);
  const [basiswerte, setBasiswerte] = useState<KostenBasiswerte | null>(null);
  const [loading, setLoading] = useState(true);

  // Laden der Konfiguration
  useEffect(() => {
    async function load() {
      try {
        const [kat, basis] = await Promise.all([
          getKategorien(),
          getBasiswerte(),
        ]);
        setKategorienConfig(kat);
        setBasiswerte(basis);

        // Initialisiere Kategorien-Eingaben falls leer
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

  // Berechnung
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

  // Endpreis automatisch aktualisieren
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

  // Handler
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

  // Formatierung
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Eingabe */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Kosten eingeben</h3>
          <p className="text-sm text-gray-500">Definieren Sie den Leistungspreis und optionalen Rabatt</p>
        </div>

        <div className="space-y-4">
          <Input
            label="Leistungspreis (CHF)"
            type="number"
            step="0.01"
            min="0"
            placeholder="z.B. 6690.00"
            value={offerte.kosten.leistungspreis || ''}
            onChange={(e) => updateKosten('leistungspreis', parseFloat(e.target.value) || 0)}
            error={errors['kosten.leistungspreis']}
            hint="Gesamtpreis für alle Leistungen (exkl. MwSt.)"
            required
          />
          <Input
            label="Rabatt (%)"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="z.B. 5"
            value={offerte.kosten.rabattProzent || ''}
            onChange={(e) => updateKosten('rabattProzent', parseFloat(e.target.value) || 0)}
            hint="Optionaler Rabatt in Prozent"
          />
        </div>
      </div>

      {/* Vorschau */}
      <div className="bg-gradient-to-br from-[#1e3a5f]/5 to-[#1e3a5f]/10 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Kosten-Vorschau</h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700">Leistungen gemäss Offerte</span>
            <span className="font-mono text-gray-900">Fr. {formatCHF(berechnung.leistungspreis)}</span>
          </div>

          {berechnung.rabattProzent > 0 && (
            <div className="flex justify-between items-center py-2 text-green-700">
              <span>Rabatt {berechnung.rabattProzent}%</span>
              <span className="font-mono">-Fr. {formatCHF(berechnung.rabattBetrag)}</span>
            </div>
          )}

          <div className="border-t border-[#1e3a5f]/20 pt-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700">Zwischentotal</span>
              <span className="font-mono text-gray-900">Fr. {formatCHF(berechnung.zwischentotal)}</span>
            </div>

            <div className="flex justify-between items-center py-2 text-gray-600">
              <span>MwSt. {MWST_SATZ}%</span>
              <span className="font-mono">Fr. {formatCHF(berechnung.mwstBetrag)}</span>
            </div>
          </div>

          <div className="border-t-2 border-[#1e3a5f]/30 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-[#1e3a5f]">Total (inkl. MwSt.)</span>
              <span className="text-xl font-bold font-mono text-[#1e3a5f]">Fr. {formatCHF(berechnung.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
