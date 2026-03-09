'use client';

import { Standort } from '@/lib/supabase';

interface StandorteTabProps {
  standorte: Standort[];
  onStandortChange: (id: string, field: keyof Standort, value: string) => void;
  onSaveStandort: (id: string) => Promise<void>;
  saving: boolean;
  inputClass: string;
}

export default function StandorteTab({
  standorte,
  onStandortChange,
  onSaveStandort,
  saving,
  inputClass,
}: StandorteTabProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">HMQ Standorte</h2>
      <div className="space-y-6">
        {standorte.map((s) => (
          <div key={s.id} className="bg-gray-50 rounded-xl p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[#1e3a5f]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-[#1e3a5f] uppercase">{s.id}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                <p className="text-sm text-gray-500">ID: {s.id}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Firma</label>
                <input
                  type="text"
                  value={s.firma || 'HMQ AG'}
                  disabled
                  className={`${inputClass} opacity-60 cursor-not-allowed`}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={s.name}
                  onChange={(e) => onStandortChange(s.id, 'name', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Strasse</label>
                <input
                  type="text"
                  value={s.strasse}
                  onChange={(e) => onStandortChange(s.id, 'strasse', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">PLZ</label>
                <input
                  type="text"
                  value={s.plz}
                  onChange={(e) => onStandortChange(s.id, 'plz', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ort</label>
                <input
                  type="text"
                  value={s.ort}
                  onChange={(e) => onStandortChange(s.id, 'ort', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2 flex items-end">
                <button
                  onClick={() => onSaveStandort(s.id)}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-xl hover:bg-[#162b47] disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        ))}
        {standorte.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Keine Standorte gefunden.</p>
            <p className="text-sm mt-1">Bitte erstellen Sie die Tabelle &quot;standorte&quot; in Supabase.</p>
          </div>
        )}
      </div>
    </div>
  );
}
