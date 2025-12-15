'use client';

import { useMemo } from 'react';
import { Offerte } from '@/lib/types';
import Input from '@/components/ui/Input';

interface Tab2KostenProps {
  offerte: Offerte;
  onChange: (offerte: Offerte) => void;
  errors: Record<string, string>;
}

function formatCHF(amount: number): string {
  return amount.toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Tab2Kosten({ offerte, onChange, errors }: Tab2KostenProps) {
  const MWST_SATZ = 8.1;

  const updateKosten = (field: string, value: number) => {
    onChange({
      ...offerte,
      kosten: { ...offerte.kosten, [field]: value },
    });
  };

  const berechnung = useMemo(() => {
    const leistungspreis = offerte.kosten.leistungspreis || 0;
    const rabattProzent = offerte.kosten.rabattProzent || 0;

    const rabattBetrag = leistungspreis * (rabattProzent / 100);
    const zwischentotal = leistungspreis - rabattBetrag;
    const mwstBetrag = zwischentotal * (MWST_SATZ / 100);
    const total = zwischentotal + mwstBetrag;

    return { leistungspreis, rabattProzent, rabattBetrag, zwischentotal, mwstBetrag, total };
  }, [offerte.kosten]);

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
