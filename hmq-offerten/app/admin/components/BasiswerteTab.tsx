'use client';

import { KostenBasiswerte } from '@/lib/supabase';

interface BasiswerteTabProps {
  basiswerte: KostenBasiswerte;
  setBasiswerte: (basiswerte: KostenBasiswerte) => void;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
  inputClass: string;
}

export default function BasiswerteTab({
  basiswerte,
  setBasiswerte,
  saving,
  onSave,
  inputClass,
}: BasiswerteTabProps) {
  function handleChange(key: string, value: string) {
    const val = parseFloat(value);
    setBasiswerte({ ...basiswerte, [key]: isNaN(val) ? 0 : val });
  }

  return (
    <form onSubmit={onSave} className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Pauschalen (CHF pro Faktor 1)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'grundlagen_chf', label: 'Grundlagen' },
            { key: 'termin_chf', label: 'Termin' },
            { key: 'bericht_chf', label: 'Bericht' },
            { key: 'kontrolle_chf', label: 'Kontrolle' },
            { key: 'zustellbestaetigung_chf', label: 'Zustellbestätigung' },
            { key: 'datenabgabe_chf', label: 'Datenabgabe' },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-sm text-gray-600 mb-1.5">{f.label}</label>
              <input
                type="number"
                step="0.05"
                value={basiswerte[f.key as keyof KostenBasiswerte] as number ?? 0}
                onChange={(e) => handleChange(f.key, e.target.value)}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Zustandsaufnahme</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Basisstunden pro Faktor</label>
            <input
              type="number"
              step="0.1"
              value={basiswerte.basisstunden_aufnahme ?? 0}
              onChange={(e) => handleChange('basisstunden_aufnahme', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Stundensatz (CHF)</label>
            <input
              type="number"
              step="0.05"
              value={basiswerte.stundensatz_aufnahme ?? 0}
              onChange={(e) => handleChange('stundensatz_aufnahme', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Material</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">USB Pauschal (CHF)</label>
            <input
              type="number"
              step="0.05"
              value={basiswerte.usb_pauschal ?? 0}
              onChange={(e) => handleChange('usb_pauschal', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Binden pro Stück (CHF)</label>
            <input
              type="number"
              step="0.05"
              value={basiswerte.binden_einheitspreis ?? 0}
              onChange={(e) => handleChange('binden_einheitspreis', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Spesen-Sätze</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'km_satz', label: 'Kilometer (CHF)' },
            { key: 'reisezeit_satz', label: 'Reisezeit/Std (CHF)' },
            { key: 'verpflegung_satz', label: 'Verpflegung (CHF)' },
            { key: 'uebernachtung_satz', label: 'Übernachtung (CHF)' },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-sm text-gray-600 mb-1.5">{f.label}</label>
              <input
                type="number"
                step="0.01"
                value={basiswerte[f.key as keyof KostenBasiswerte] as number ?? 0}
                onChange={(e) => handleChange(f.key, e.target.value)}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 bg-[#1e3a5f] text-white font-semibold rounded-xl hover:bg-[#162b47] disabled:opacity-50 transition-colors"
      >
        {saving ? 'Speichern...' : 'Basiswerte speichern'}
      </button>
    </form>
  );
}
