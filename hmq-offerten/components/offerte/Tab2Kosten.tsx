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
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Kosten eingeben</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
          <Input
            label="Leistungspreis (CHF)"
            type="number"
            step="0.01"
            min="0"
            placeholder="z.B. 6690.00"
            value={offerte.kosten.leistungspreis || ''}
            onChange={(e) => updateKosten('leistungspreis', parseFloat(e.target.value) || 0)}
            error={errors['kosten.leistungspreis']}
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
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Kosten-Vorschau</h2>
        <div className="bg-gray-50 rounded-lg p-6 max-w-md">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-2">Leistungen gemäss Offerte</td>
                <td className="py-2 text-right font-mono">Fr. {formatCHF(berechnung.leistungspreis)}</td>
              </tr>
              {berechnung.rabattProzent > 0 && (
                <tr className="text-gray-600">
                  <td className="py-2">Rabatt {berechnung.rabattProzent}%</td>
                  <td className="py-2 text-right font-mono">-Fr. {formatCHF(berechnung.rabattBetrag)}</td>
                </tr>
              )}
              <tr className="border-t border-gray-300">
                <td className="py-2">Zwischentotal</td>
                <td className="py-2 text-right font-mono">Fr. {formatCHF(berechnung.zwischentotal)}</td>
              </tr>
              <tr className="text-gray-600">
                <td className="py-2">MwSt. {MWST_SATZ}%</td>
                <td className="py-2 text-right font-mono">Fr. {formatCHF(berechnung.mwstBetrag)}</td>
              </tr>
              <tr className="border-t-2 border-gray-400 font-semibold text-base">
                <td className="py-3">Total (inkl. MwSt.)</td>
                <td className="py-3 text-right font-mono">Fr. {formatCHF(berechnung.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
