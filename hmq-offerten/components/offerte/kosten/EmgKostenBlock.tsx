'use client';

import { useMemo } from 'react';
import { EmgKonfiguration, EmgGrundpauschaleEingabe, Offerte, createEmptyEmg } from '@/lib/types';
import { EmgBasiswerte } from '@/lib/supabase';
import { berechneEmgKosten } from '@/lib/emg-kosten-rechner';
import { formatCHF } from '@/lib/kosten-helpers';

interface EmgKostenBlockProps {
  offerte: Offerte;
  onChange: (offerte: Offerte) => void;
  emgBasiswerte: EmgBasiswerte | null;
  emgFehler: boolean;
}

export default function EmgKostenBlock({
  offerte,
  onChange,
  emgBasiswerte,
  emgFehler,
}: EmgKostenBlockProps) {
  const emg = offerte.emg ?? createEmptyEmg();

  const ergebnis = useMemo(
    () => (emgBasiswerte ? berechneEmgKosten(emg, emgBasiswerte) : null),
    [emg, emgBasiswerte]
  );

  function updateEmg(patch: Partial<EmgKonfiguration>) {
    onChange({ ...offerte, emg: { ...emg, ...patch } });
  }

  function updateGrundpauschale(key: keyof EmgGrundpauschaleEingabe, value: number | null) {
    updateEmg({
      grundpauschale: { ...emg.grundpauschale, [key]: value },
      // Manuelles Grundpauschale-Total zurücksetzen, sobald Komponenten ändern
      overrides: { ...emg.overrides, grundpauschaleEnd: null },
    });
  }

  function updateOverride(key: keyof EmgKonfiguration['overrides'], value: number | null) {
    updateEmg({ overrides: { ...emg.overrides, [key]: value } });
  }

  const inputClass =
    'w-full px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm text-center focus:bg-white focus:ring-2 focus:ring-hmq-blue/40 transition-all';
  const overrideClass =
    'w-28 px-2 py-1 text-right font-mono text-sm rounded-lg border border-amber-200 bg-white focus:ring-2 focus:ring-hmq-blue/40';

  if (emgFehler) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-sm text-red-800">
        <p className="font-semibold mb-1">EMG-Basiswerte fehlen</p>
        <p>
          Die Tabelle <span className="font-mono">emg_basiswerte</span> ist nicht vorhanden.
          Migration <span className="font-mono">database/emg-migration.sql</span> im Supabase
          SQL Editor ausführen und die Seite neu laden. Ohne Basiswerte kann keine
          EMG-Offerte generiert werden.
        </p>
      </div>
    );
  }

  if (!emgBasiswerte || !ergebnis) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-200 flex items-center justify-center">
        <div className="w-6 h-6 border-3 border-hmq-red border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const hatEingaben = (emg.anzahlGeraete ?? 0) >= 1 && (emg.anzahlWochen ?? 0) >= 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Spalte 1+2: Grundpauschale-Komponenten und Positionen */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-card border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-hmq-red shrink-0" aria-hidden="true" />
          Erschütterungsmessung
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          {hatEingaben
            ? `${emg.anzahlGeraete} Geräte, ${emg.anzahlWochen} Wochen (Eingaben in Tab 1)`
            : 'Anzahl Geräte und Wochen in Tab 1 erfassen'}
        </p>

        {/* Grundpauschale-Komponenten */}
        <h4 className="kicker mb-3">Berechnung Grundpauschale</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2 pr-2 font-medium">Komponente</th>
                <th className="py-2 pr-2 font-medium text-center w-20">Einheit</th>
                <th className="py-2 pr-2 font-medium text-center w-24">Anzahl</th>
                <th className="py-2 pr-2 font-medium text-right w-24">Ansatz</th>
                <th className="py-2 font-medium text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {ergebnis.komponenten.map((k) => (
                <tr key={k.key} className="border-b border-gray-50">
                  <td className="py-1.5 pr-2 text-gray-700">
                    {k.label}
                    {k.key === 'konfigurationStk' && emg.grundpauschale.konfigurationStk === null && (
                      <span className="text-xs text-gray-400 ml-1.5">auto: Anzahl Geräte</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 text-center text-gray-500">{k.einheit}</td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      min="0"
                      step={k.einheit === 'km' ? '1' : '0.5'}
                      value={
                        k.key === 'konfigurationStk'
                          ? emg.grundpauschale.konfigurationStk ?? ''
                          : (emg.grundpauschale[k.key as keyof EmgGrundpauschaleEingabe] as number) || ''
                      }
                      placeholder={k.key === 'konfigurationStk' ? String(emg.anzahlGeraete ?? 0) : '0'}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        updateGrundpauschale(
                          k.key as keyof EmgGrundpauschaleEingabe,
                          k.key === 'konfigurationStk'
                            ? (Number.isFinite(v) ? v : null)
                            : (Number.isFinite(v) ? v : 0)
                        );
                      }}
                      className={inputClass}
                    />
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono text-gray-500">
                    {formatCHF(k.ansatz)}
                  </td>
                  <td className="py-1.5 text-right font-mono">{formatCHF(k.betrag)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Positionen mit Overrides */}
        <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">
              Grundpauschale
              <span className="text-xs text-gray-400 ml-1.5">
                berechnet: {formatCHF(ergebnis.grundpauschaleBerechnet)}
              </span>
              {emg.overrides.grundpauschaleEnd !== null && (
                <span className="text-orange-500 text-xs font-medium ml-1.5">manuell</span>
              )}
            </span>
            <input
              type="number"
              min="0"
              step="0.05"
              value={emg.overrides.grundpauschaleEnd ?? ''}
              placeholder={formatCHF(ergebnis.grundpauschaleBerechnet)}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateOverride('grundpauschaleEnd', Number.isFinite(v) ? v : null);
              }}
              className={overrideClass}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-700">
              Vorhalten
              <span className="text-xs text-gray-400 ml-1.5">
                {ergebnis.geraetewochen} Gerätewochen × CHF {formatCHF(ergebnis.wochentarif)}
              </span>
              {emg.overrides.vorhaltenEnd !== null && (
                <span className="text-orange-500 text-xs font-medium ml-1.5">manuell</span>
              )}
            </span>
            <input
              type="number"
              min="0"
              step="0.05"
              value={emg.overrides.vorhaltenEnd ?? ''}
              placeholder={formatCHF(ergebnis.vorhaltenBerechnet)}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateOverride('vorhaltenEnd', Number.isFinite(v) ? v : null);
              }}
              className={overrideClass}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-700">
              Abschlussbericht
              <span className="text-xs text-gray-400 ml-1.5">
                {emg.abschlussbericht ? 'eingerechnet' : 'optional, nicht eingerechnet (Tab 1)'}
              </span>
              {emg.overrides.abschlussberichtPreisEnd !== null && (
                <span className="text-orange-500 text-xs font-medium ml-1.5">manuell</span>
              )}
            </span>
            <input
              type="number"
              min="0"
              step="0.05"
              value={emg.overrides.abschlussberichtPreisEnd ?? ''}
              placeholder={formatCHF(emgBasiswerte.abschlussbericht_chf)}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateOverride('abschlussberichtPreisEnd', Number.isFinite(v) ? v : null);
              }}
              className={overrideClass}
            />
          </div>
        </div>

        {/* Wochentarif-Übersicht */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Wochentarife (Admin)</h4>
          <div className="flex flex-wrap gap-2 text-xs">
            {ergebnis.tarife.map((t) => (
              <span
                key={t.abWochen}
                className={`px-2.5 py-1 rounded-full border ${
                  t.preisChf === ergebnis.wochentarif && hatEingaben
                    ? 'bg-hmq-red text-white border-hmq-red'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                ab {t.abWochen} Wo.: CHF {formatCHF(t.preisChf)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Spalte 3: EMG-Total */}
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-hmq-red to-hmq-red-soft rounded-2xl p-6 text-white">
          <h3 className="font-semibold mb-4">Total Erschütterungsmessung</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/80">Grundpauschale</span>
              <span className="font-mono">{formatCHF(ergebnis.grundpauschale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/80">Vorhalten</span>
              <span className="font-mono">{formatCHF(ergebnis.vorhalten)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/80">
                Abschlussbericht{ergebnis.abschlussberichtAktiv ? '' : ' (nicht eingerechnet)'}
              </span>
              <span className="font-mono">
                {ergebnis.abschlussberichtAktiv
                  ? formatCHF(ergebnis.abschlussberichtPreis)
                  : `(${formatCHF(ergebnis.abschlussberichtPreis)})`}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/20">
              <span className="text-white/80">Zwischentotal</span>
              <span className="font-mono">{formatCHF(ergebnis.zwischentotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Rabatt</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={emg.rabattProzent || ''}
                  onChange={(e) => updateEmg({ rabattProzent: parseFloat(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 bg-white/20 border-0 rounded-lg text-sm text-center text-white placeholder-white/50 focus:bg-white/30 focus:ring-0"
                  placeholder="0"
                />
                <span>%</span>
                {emg.rabattProzent > 0 && (
                  <span className="text-white/60 text-xs">(-{formatCHF(ergebnis.rabattBetrag)})</span>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-white/20 my-4"></div>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-lg font-medium">Total inkl. MwSt.</span>
              <div className="text-white/60 text-xs">inkl. 8.1% MwSt. ({formatCHF(ergebnis.mwstBetrag)})</div>
            </div>
            <span className="text-2xl font-bold font-mono">CHF {formatCHF(ergebnis.totalInklMwst)}</span>
          </div>
        </div>

        {!hatEingaben && (
          <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
            Anzahl Geräte und Wochen in Tab 1 erfassen
          </div>
        )}
      </div>
    </div>
  );
}
