'use client';

import { AppEinstellungen } from '@/lib/supabase';

interface EinstellungenTabProps {
  einstellungen: AppEinstellungen;
  setEinstellungen: (einstellungen: AppEinstellungen) => void;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
  inputClass: string;
}

export default function EinstellungenTab({
  einstellungen,
  setEinstellungen,
  saving,
  onSave,
  inputClass,
}: EinstellungenTabProps) {
  return (
    <form onSubmit={onSave}>
      <h2 className="text-lg font-semibold mb-6">Standard-Einstellungen</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">Standard-Standort</label>
          <select
            value={einstellungen.standort_default}
            onChange={(e) => setEinstellungen({ ...einstellungen, standort_default: e.target.value })}
            className={inputClass}
          >
            <option value="zh">Zürich-Opfikon</option>
            <option value="gr">Chur</option>
            <option value="ag">Zofingen</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">Standard-Vorlaufzeit</label>
          <input
            type="text"
            value={einstellungen.vorlaufzeit_default}
            onChange={(e) => setEinstellungen({ ...einstellungen, vorlaufzeit_default: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">Standard-Einsatzpauschalen</label>
          <select
            value={einstellungen.einsatzpauschalen_default}
            onChange={(e) => setEinstellungen({ ...einstellungen, einsatzpauschalen_default: parseInt(e.target.value) })}
            className={inputClass}
          >
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 bg-[#1e3a5f] text-white font-semibold rounded-xl hover:bg-[#162b47] disabled:opacity-50 transition-colors"
      >
        {saving ? 'Speichern...' : 'Einstellungen speichern'}
      </button>
    </form>
  );
}
