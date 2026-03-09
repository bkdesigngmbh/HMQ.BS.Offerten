'use client';

import { Offerte } from '@/lib/types';

interface SpesenGridProps {
  offerte: Offerte;
  onSpesenChange: (field: keyof Offerte['kostenBerechnung']['spesen'], value: number) => void;
  einsatzpauschaleManual: boolean;
  onEinsatzpauschaleChange: (value: number) => void;
  onEinsatzpauschaleManualSet: () => void;
}

export default function SpesenGrid({
  offerte,
  onSpesenChange,
  einsatzpauschaleManual,
  onEinsatzpauschaleChange,
  onEinsatzpauschaleManualSet,
}: SpesenGridProps) {
  return (
    <div className="mt-6 pt-6 border-t border-gray-100">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Einsätze & Spesen</h4>
      <div className="grid grid-cols-5 gap-2">
        <div className="bg-gray-50 rounded-lg p-2">
          <label className="block text-xs text-gray-500 mb-1.5 flex items-center gap-1">
            Einsätze
            {einsatzpauschaleManual && (
              <span className="text-orange-500 text-xs font-medium">manuell</span>
            )}
          </label>
          <select
            value={offerte.einsatzpauschalen.toString()}
            onChange={(e) => {
              onEinsatzpauschaleManualSet();
              onEinsatzpauschaleChange(parseInt(e.target.value));
            }}
            className="w-full px-2 py-1.5 bg-white border-0 rounded-md text-sm text-center focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <label className="block text-xs text-gray-500 mb-1.5">Kilometer</label>
          <input
            type="number"
            min="0"
            value={offerte.kostenBerechnung.spesen.kilometer || ''}
            onChange={(e) => onSpesenChange('kilometer', parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1.5 bg-white border-0 rounded-md text-sm text-center focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
            placeholder="0"
          />
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <label className="block text-xs text-gray-500 mb-1.5">Reisezeit</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={offerte.kostenBerechnung.spesen.reisezeitStunden || ''}
            onChange={(e) => onSpesenChange('reisezeitStunden', parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1.5 bg-white border-0 rounded-md text-sm text-center focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
            placeholder="0"
          />
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <label className="block text-xs text-gray-500 mb-1.5">Verpflegung</label>
          <input
            type="number"
            min="0"
            value={offerte.kostenBerechnung.spesen.verpflegungAnzahl || ''}
            onChange={(e) => onSpesenChange('verpflegungAnzahl', parseInt(e.target.value) || 0)}
            className="w-full px-2 py-1.5 bg-white border-0 rounded-md text-sm text-center focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
            placeholder="0"
          />
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <label className="block text-xs text-gray-500 mb-1.5">Übernachtung</label>
          <input
            type="number"
            min="0"
            value={offerte.kostenBerechnung.spesen.uebernachtungenAnzahl || ''}
            onChange={(e) => onSpesenChange('uebernachtungenAnzahl', parseInt(e.target.value) || 0)}
            className="w-full px-2 py-1.5 bg-white border-0 rounded-md text-sm text-center focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
}
