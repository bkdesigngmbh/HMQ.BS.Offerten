'use client';

import { EmgBasiswerte } from '@/lib/supabase';

interface EmgTabProps {
  basiswerte: EmgBasiswerte | null;
  setBasiswerte: (basiswerte: EmgBasiswerte) => void;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
  inputClass: string;
}

export default function EmgTab({
  basiswerte,
  setBasiswerte,
  saving,
  onSave,
  inputClass,
}: EmgTabProps) {
  if (!basiswerte) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-800">
        EMG-Basiswerte konnten nicht geladen werden. Vermutlich fehlt die Tabelle
        <span className="font-mono mx-1">emg_basiswerte</span>:
        Migration <span className="font-mono mx-1">database/emg-migration.sql</span>
        im Supabase SQL Editor ausführen und die Seite neu laden.
      </div>
    );
  }

  function handleChange(key: keyof EmgBasiswerte, value: string) {
    const val = parseFloat(value);
    setBasiswerte({ ...basiswerte!, [key]: isNaN(val) ? 0 : val });
  }

  return (
    <form onSubmit={onSave} className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-1">Grundpauschale-Ansätze</h3>
        <p className="text-sm text-gray-500 mb-4">
          Ansätze für die Komponenten der Grundpauschale (Anzahlen werden pro Offerte erfasst).
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Stundensatz (CHF/h)</label>
            <input
              type="number"
              step="0.05"
              value={basiswerte.stundensatz ?? 0}
              onChange={(e) => handleChange('stundensatz', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Konfiguration (CHF/Stk.)</label>
            <input
              type="number"
              step="0.05"
              value={basiswerte.konfiguration_stk_chf ?? 0}
              onChange={(e) => handleChange('konfiguration_stk_chf', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Fahrkosten (CHF/km)</label>
            <input
              type="number"
              step="0.01"
              value={basiswerte.km_satz ?? 0}
              onChange={(e) => handleChange('km_satz', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-1">Wochentarife Vorhalten</h3>
        <p className="text-sm text-gray-500 mb-4">
          Preis pro Gerät und Woche, gestaffelt nach Laufzeit. Massgebend ist die
          Laufzeit in Wochen (z.B. 16 Wochen → Tarif «ab {basiswerte.tarif2_ab} Wochen»).
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([1, 2, 3, 4] as const).map((n) => (
            <div key={n} className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Ab Wochen</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={basiswerte[`tarif${n}_ab` as keyof EmgBasiswerte] as number ?? 0}
                  onChange={(e) => handleChange(`tarif${n}_ab` as keyof EmgBasiswerte, e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">CHF pro Gerät/Woche</label>
                <input
                  type="number"
                  step="0.05"
                  value={basiswerte[`tarif${n}_chf` as keyof EmgBasiswerte] as number ?? 0}
                  onChange={(e) => handleChange(`tarif${n}_chf` as keyof EmgBasiswerte, e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Abschlussbericht</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Preis (CHF)</label>
            <input
              type="number"
              step="0.05"
              value={basiswerte.abschlussbericht_chf ?? 0}
              onChange={(e) => handleChange('abschlussbericht_chf', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 bg-[#1e3a5f] text-white font-semibold rounded-xl hover:bg-[#162b47] disabled:opacity-50 transition-colors"
      >
        {saving ? 'Speichern...' : 'EMG-Basiswerte speichern'}
      </button>
    </form>
  );
}
