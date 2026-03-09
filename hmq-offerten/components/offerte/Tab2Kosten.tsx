'use client';

import { useState, useMemo } from 'react';
import { Offerte } from '@/lib/types';
import { berechneKosten, KostenErgebnis } from '@/lib/kosten-rechner';
import { rundeAuf5Rappen } from '@/lib/kosten-helpers';
import { useKostenConfig } from '@/lib/hooks/use-kosten-config';
import { useEditablePreise } from '@/lib/hooks/use-editable-preise';
import { useEinsatzpauschale } from '@/lib/hooks/use-einsatzpauschale';
import KategorienGrid from './kosten/KategorienGrid';
import SpesenGrid from './kosten/SpesenGrid';
import KostenUebersicht from './kosten/KostenUebersicht';

interface Tab2KostenProps {
  offerte: Offerte;
  onChange: (offerte: Offerte) => void;
}

export default function Tab2Kosten({ offerte, onChange }: Tab2KostenProps) {
  const [showPlanbeilage, setShowPlanbeilage] = useState(true);
  const [einsatzpauschaleManual, setEinsatzpauschaleManual] = useState(false);

  // Load config from Supabase
  const { kategorienConfig, basiswerte, loading } = useKostenConfig(offerte, onChange);

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

  // Editable prices state management
  const {
    editablePreise,
    setEditablePreise,
    setManuallyChanged,
    handlePreisChange,
    isManuallyChanged,
    initialized,
  } = useEditablePreise(offerte, onChange, ergebnis, basiswerte, setEinsatzpauschaleManual);

  // Auto-calculate einsatzpauschale
  useEinsatzpauschale(offerte, onChange, ergebnis, initialized, einsatzpauschaleManual);

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

  function getBeschreibungForKategorie(kategorieId: string): string | undefined {
    const kat = kategorienConfig.find(k => k.id === kategorieId);
    return kat?.beschreibung ?? undefined;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-[#1e3a5f] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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
                {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic base64 image, not compatible with next/image */}
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
        <KategorienGrid
          kategorien={offerte.kostenBerechnung.kategorien}
          onKategorieChange={handleKategorieChange}
          getBeschreibungForKategorie={getBeschreibungForKategorie}
          totalN={ergebnis?.totalN}
        />

        <SpesenGrid
          offerte={offerte}
          onSpesenChange={handleSpesenChange}
          einsatzpauschaleManual={einsatzpauschaleManual}
          onEinsatzpauschaleChange={(value) => onChange({ ...offerte, einsatzpauschalen: value })}
          onEinsatzpauschaleManualSet={() => setEinsatzpauschaleManual(true)}
        />

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
      <KostenUebersicht
        editablePreise={editablePreise}
        isManuallyChanged={isManuallyChanged}
        handlePreisChange={handlePreisChange}
        offerte={offerte}
        onRabattChange={handleRabattChange}
        showPositionen={!!ergebnis && ergebnis.totalN > 0}
      />
      </div>
    </div>
  );
}
