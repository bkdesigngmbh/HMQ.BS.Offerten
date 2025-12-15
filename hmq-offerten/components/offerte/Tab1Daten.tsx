'use client';

import { Offerte } from '@/lib/types';

interface Tab1DatenProps {
  offerte: Offerte;
  onChange: (offerte: Offerte) => void;
}

export default function Tab1Daten({ offerte, onChange }: Tab1DatenProps) {

  function updateField(section: string, field: string, value: any) {
    if (section === 'root') {
      onChange({ ...offerte, [field]: value });
    } else {
      onChange({
        ...offerte,
        [section]: { ...(offerte as any)[section], [field]: value },
      });
    }
  }

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Spalte 1: Offert-Info */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          Offert-Informationen
        </h3>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Offertnummer *</label>
            <input
              type="text"
              value={offerte.offertnummer}
              onChange={(e) => updateField('root', 'offertnummer', e.target.value)}
              placeholder="z.B. 51.25.405"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Datum</label>
              <input
                type="date"
                value={offerte.datum}
                onChange={(e) => updateField('root', 'datum', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Standort</label>
              <select
                value={offerte.standortId}
                onChange={(e) => updateField('root', 'standortId', e.target.value)}
                className={inputClass}
              >
                <option value="zh">Zürich</option>
                <option value="gr">Chur</option>
                <option value="ag">Zofingen</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Vorlaufzeit</label>
            <input
              type="text"
              value={offerte.vorlaufzeit}
              onChange={(e) => updateField('root', 'vorlaufzeit', e.target.value)}
              placeholder="z.B. 3 Wochen"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Spalte 2: Projekt */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          Projekt
        </h3>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Projektort</label>
            <input
              type="text"
              value={offerte.projekt.ort}
              onChange={(e) => updateField('projekt', 'ort', e.target.value)}
              placeholder="z.B. Zürich"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Bezeichnung</label>
            <input
              type="text"
              value={offerte.projekt.bezeichnung}
              onChange={(e) => updateField('projekt', 'bezeichnung', e.target.value)}
              placeholder="z.B. Seestrasse 44, Neubau MFH"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Anfragedatum</label>
            <input
              type="date"
              value={offerte.projekt.anfrageDatum}
              onChange={(e) => updateField('projekt', 'anfrageDatum', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Spalte 3: Empfänger */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          Empfänger
        </h3>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Firma</label>
            <input
              type="text"
              value={offerte.empfaenger.firma}
              onChange={(e) => updateField('empfaenger', 'firma', e.target.value)}
              placeholder="Firmenname"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Anrede</label>
              <select
                value={offerte.empfaenger.anrede}
                onChange={(e) => updateField('empfaenger', 'anrede', e.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Vorname</label>
              <input
                type="text"
                value={offerte.empfaenger.vorname}
                onChange={(e) => updateField('empfaenger', 'vorname', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Nachname</label>
              <input
                type="text"
                value={offerte.empfaenger.nachname}
                onChange={(e) => updateField('empfaenger', 'nachname', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Strasse</label>
            <input
              type="text"
              value={offerte.empfaenger.strasse}
              onChange={(e) => updateField('empfaenger', 'strasse', e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>PLZ</label>
              <input
                type="text"
                value={offerte.empfaenger.plz}
                onChange={(e) => updateField('empfaenger', 'plz', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Ort</label>
              <input
                type="text"
                value={offerte.empfaenger.ort}
                onChange={(e) => updateField('empfaenger', 'ort', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
