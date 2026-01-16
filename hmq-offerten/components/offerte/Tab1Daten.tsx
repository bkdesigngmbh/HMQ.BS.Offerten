'use client';

import { Offerte } from '@/lib/types';
import CheckboxGruppe from './CheckboxGruppe';
import PlanUpload from './PlanUpload';
import FolderImport from './FolderImport';

interface Tab1DatenProps {
  offerte: Offerte;
  onChange: (offerte: Offerte) => void;
  onCreateNew?: (offerte: Offerte) => void;
  errors?: Record<string, string>;
}

export default function Tab1Daten({ offerte, onChange, onCreateNew, errors = {} }: Tab1DatenProps) {

  function updateField(path: string, value: any) {
    const keys = path.split('.');
    const newOfferte = JSON.parse(JSON.stringify(offerte));
    let obj: any = newOfferte;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    onChange(newOfferte);
  }

  function updateCheckbox(group: string, key: string, value: boolean | string) {
    const newCheckboxen = JSON.parse(JSON.stringify(offerte.checkboxen));
    (newCheckboxen as any)[group][key] = value;

    // === AUTOMATISIERUNG ===

    // 1. Strassen: Automatisch Belag und Rand mitsetzen
    if (group === 'erstaufnahme' && key === 'strassen' && typeof value === 'boolean') {
      newCheckboxen.erstaufnahme.strassenBelag = value;
      newCheckboxen.erstaufnahme.strassenRand = value;
    }

    // 2. Dokumentation: Foto-Checkboxen automatisch basierend auf Erstaufnahme setzen
    if (group === 'erstaufnahme') {
      const ea = newCheckboxen.erstaufnahme;
      newCheckboxen.dokumentation.fotoAussen = ea.fassaden || ea.aussenanlagen;
      newCheckboxen.dokumentation.fotoInnen = ea.innenraeume;
      newCheckboxen.dokumentation.fotoStrasse = ea.strassen;
    }

    onChange({ ...offerte, checkboxen: newCheckboxen });
  }

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="space-y-6">
      {/* Ordner-Import */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          Ordner-Import
        </h3>
        <FolderImport offerte={offerte} onChange={onChange} onCreateNew={onCreateNew} />
      </div>

      {/* 3-Spalten Layout: Offert-Info, Projekt, Empfänger */}
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
                onChange={(e) => updateField('offertnummer', e.target.value)}
                placeholder="z.B. 51.25.405"
                className={inputClass}
              />
              {errors.offertnummer && <p className="text-red-500 text-xs mt-1">{errors.offertnummer}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Datum</label>
                <input
                  type="date"
                  value={offerte.datum}
                  onChange={(e) => updateField('datum', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Standort</label>
                <select
                  value={offerte.standortId}
                  onChange={(e) => updateField('standortId', e.target.value)}
                  className={inputClass}
                >
                  <option value="zh">Zürich-Opfikon</option>
                  <option value="gr">Chur</option>
                  <option value="ag">Zofingen</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Vorlaufzeit</label>
              <select
                value={offerte.vorlaufzeit}
                onChange={(e) => updateField('vorlaufzeit', e.target.value)}
                className={inputClass}
              >
                <option value="2 Wochen">2 Wochen</option>
                <option value="3 Wochen">3 Wochen</option>
                <option value="4 Wochen">4 Wochen</option>
                <option value="6 Wochen">6 Wochen</option>
              </select>
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
              <label className={labelClass}>Projektort *</label>
              <input
                type="text"
                value={offerte.projekt.ort}
                onChange={(e) => updateField('projekt.ort', e.target.value)}
                placeholder="z.B. Zürich"
                className={inputClass}
              />
              {errors['projekt.ort'] && <p className="text-red-500 text-xs mt-1">{errors['projekt.ort']}</p>}
            </div>

            <div>
              <label className={labelClass}>Bezeichnung *</label>
              <input
                type="text"
                value={offerte.projekt.bezeichnung}
                onChange={(e) => updateField('projekt.bezeichnung', e.target.value)}
                placeholder="z.B. Seestrasse 44, Neubau MFH"
                className={inputClass}
              />
              {errors['projekt.bezeichnung'] && <p className="text-red-500 text-xs mt-1">{errors['projekt.bezeichnung']}</p>}
            </div>

            <div>
              <label className={labelClass}>Anfragedatum</label>
              <input
                type="date"
                value={offerte.projekt.anfrageDatum}
                onChange={(e) => updateField('projekt.anfrageDatum', e.target.value)}
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
              <label className={labelClass}>Firma *</label>
              <input
                type="text"
                value={offerte.empfaenger.firma}
                onChange={(e) => updateField('empfaenger.firma', e.target.value)}
                placeholder="Firmenname"
                className={inputClass}
              />
              {errors['empfaenger.firma'] && <p className="text-red-500 text-xs mt-1">{errors['empfaenger.firma']}</p>}
            </div>

            <div>
              <label className={labelClass}>Abteilung</label>
              <input
                type="text"
                value={offerte.empfaenger.abteilung || ''}
                onChange={(e) => updateField('empfaenger.abteilung', e.target.value)}
                placeholder="z.B. Abteilung Hochbau"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Anrede</label>
                <select
                  value={offerte.empfaenger.anrede}
                  onChange={(e) => updateField('empfaenger.anrede', e.target.value)}
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
                  onChange={(e) => updateField('empfaenger.vorname', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Nachname</label>
                <input
                  type="text"
                  value={offerte.empfaenger.nachname}
                  onChange={(e) => updateField('empfaenger.nachname', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Funktion</label>
              <input
                type="text"
                value={offerte.empfaenger.funktion}
                onChange={(e) => updateField('empfaenger.funktion', e.target.value)}
                placeholder="z.B. dipl. Ingenieur ETH/SIA"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Strasse *</label>
              <input
                type="text"
                value={offerte.empfaenger.strasse}
                onChange={(e) => updateField('empfaenger.strasse', e.target.value)}
                className={inputClass}
              />
              {errors['empfaenger.strasse'] && <p className="text-red-500 text-xs mt-1">{errors['empfaenger.strasse']}</p>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>PLZ *</label>
                <input
                  type="text"
                  value={offerte.empfaenger.plz}
                  onChange={(e) => updateField('empfaenger.plz', e.target.value)}
                  className={inputClass}
                />
                {errors['empfaenger.plz'] && <p className="text-red-500 text-xs mt-1">{errors['empfaenger.plz']}</p>}
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Ort *</label>
                <input
                  type="text"
                  value={offerte.empfaenger.ort}
                  onChange={(e) => updateField('empfaenger.ort', e.target.value)}
                  className={inputClass}
                />
                {errors['empfaenger.ort'] && <p className="text-red-500 text-xs mt-1">{errors['empfaenger.ort']}</p>}
              </div>
            </div>
            <p className="text-xs text-gray-500">PLZ wird automatisch mit "CH-" ergänzt</p>
          </div>
        </div>
      </div>

      {/* === CHECKBOXEN === */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          Leistungsumfang
        </h3>

        <div className="space-y-6">
          {/* 1.1 Art des Bauvorhabens */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">1.1 Art des Bauvorhabens</h4>
            <div className="space-y-3">
              <CheckboxGruppe
                titel="Bauvorhaben"
                checkboxen={[
                  { key: 'neubau', label: 'Neubau', checked: offerte.checkboxen.artBauvorhaben.neubau },
                  { key: 'umbau', label: 'Umbau', checked: offerte.checkboxen.artBauvorhaben.umbau },
                  { key: 'rueckbau', label: 'Rückbau', checked: offerte.checkboxen.artBauvorhaben.rueckbau },
                ]}
                onChange={(key, value) => updateCheckbox('artBauvorhaben', key, value)}
                sonstigesItems={[{ key: 'sonstiges', value: offerte.checkboxen.artBauvorhaben.sonstiges, placeholder: 'Sonstiges...' }]}
                onSonstigesChange={(key, value) => updateCheckbox('artBauvorhaben', key, value)}
              />
              <CheckboxGruppe
                titel="Art der Gebäude"
                checkboxen={[
                  { key: 'efhFreistehend', label: 'Einfamilienhäuser freistehend', checked: offerte.checkboxen.artGebaeude.efhFreistehend },
                  { key: 'reihenhaus', label: 'Reihenhäuser', checked: offerte.checkboxen.artGebaeude.reihenhaus },
                  { key: 'terrassenhaus', label: 'Terrassenhäuser', checked: offerte.checkboxen.artGebaeude.terrassenhaus },
                  { key: 'mfh', label: 'Mehrfamilienhäuser', checked: offerte.checkboxen.artGebaeude.mfh },
                  { key: 'strassen', label: 'Strassen/Vorplätze', checked: offerte.checkboxen.artGebaeude.strassen },
                  { key: 'kunstbauten', label: 'Kunstbauten', checked: offerte.checkboxen.artGebaeude.kunstbauten },
                ]}
                onChange={(key, value) => updateCheckbox('artGebaeude', key, value)}
                sonstigesItems={[
                  { key: 'sonstiges1', value: offerte.checkboxen.artGebaeude.sonstiges1, placeholder: 'Sonstiges 1...' },
                  { key: 'sonstiges2', value: offerte.checkboxen.artGebaeude.sonstiges2, placeholder: 'Sonstiges 2...' },
                ]}
                onSonstigesChange={(key, value) => updateCheckbox('artGebaeude', key, value)}
              />
            </div>
          </div>

          {/* 1.2 Tätigkeiten */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">1.2 Tätigkeiten</h4>
            <CheckboxGruppe
              titel="Tätigkeiten, die Erschütterungen und Rissbildungen erzeugen können"
              checkboxen={[
                { key: 'aushub', label: 'Aushubarbeiten', checked: offerte.checkboxen.taetigkeiten.aushub },
                { key: 'rammarbeiten', label: 'Rammarbeiten (Spund- / Rühlwände)', checked: offerte.checkboxen.taetigkeiten.rammarbeiten },
                { key: 'mikropfaehle', label: 'Mikropfähle / Anker setzen', checked: offerte.checkboxen.taetigkeiten.mikropfaehle },
                { key: 'baustellenverkehr', label: 'Baustellenverkehr', checked: offerte.checkboxen.taetigkeiten.baustellenverkehr },
                { key: 'schwereMaschinen', label: 'schwere Maschinen', checked: offerte.checkboxen.taetigkeiten.schwereMaschinen },
                { key: 'sprengungen', label: 'Sprengungen', checked: offerte.checkboxen.taetigkeiten.sprengungen },
                { key: 'diverses', label: 'Diverses', checked: offerte.checkboxen.taetigkeiten.diverses },
              ]}
              onChange={(key, value) => updateCheckbox('taetigkeiten', key, value)}
              sonstigesItems={[{ key: 'sonstiges', value: offerte.checkboxen.taetigkeiten.sonstiges, placeholder: 'Sonstiges...' }]}
              onSonstigesChange={(key, value) => updateCheckbox('taetigkeiten', key, value)}
            />
          </div>

          {/* 2.1 Koordination */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">2.1 Koordination mit den Eigentümern</h4>
            <CheckboxGruppe
              titel="Koordination"
              checkboxen={[
                { key: 'schriftlicheInfo', label: 'schriftliche Eigentümerinformation', checked: offerte.checkboxen.koordination.schriftlicheInfo },
                { key: 'terminvereinbarung', label: 'Terminvereinbarung mit den betroffenen Eigentümern', checked: offerte.checkboxen.koordination.terminvereinbarung },
                { key: 'durchAuftraggeber', label: 'durch den Auftraggeber', checked: offerte.checkboxen.koordination.durchAuftraggeber },
              ]}
              onChange={(key, value) => updateCheckbox('koordination', key, value)}
            />
          </div>

          {/* 2.2 Beweissicherung Erstaufnahme */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">2.2 Beweissicherung Erstaufnahme</h4>
            <CheckboxGruppe
              titel="Zu dokumentierende Objekte"
              checkboxen={[
                { key: 'fassaden', label: 'Fassaden', checked: offerte.checkboxen.erstaufnahme.fassaden },
                { key: 'innenraeume', label: 'Innenräume', checked: offerte.checkboxen.erstaufnahme.innenraeume },
                { key: 'aussenanlagen', label: 'Aussenanlagen', checked: offerte.checkboxen.erstaufnahme.aussenanlagen },
                { key: 'strassen', label: 'Strassen/Vorplätze', checked: offerte.checkboxen.erstaufnahme.strassen },
                // strassenBelag und strassenRand werden automatisch mitgesetzt
              ]}
              onChange={(key, value) => updateCheckbox('erstaufnahme', key, value)}
            />
          </div>

          {/* 2.3 Dokumentation */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">2.3 Dokumentation/Datenabgabe</h4>
            <CheckboxGruppe
              titel="Berichtinhalt pro Parzelle"
              checkboxen={[
                { key: 'rissprotokoll', label: 'Rissprotokoll', checked: offerte.checkboxen.dokumentation.rissprotokoll },
                // fotoAussen, fotoInnen, fotoStrasse werden automatisch von 2.2 Erstaufnahme gesetzt
                { key: 'zustellbestaetigung', label: 'Zustellbestätigung', checked: offerte.checkboxen.dokumentation.zustellbestaetigung },
                { key: 'datenabgabe', label: 'Datenabgabe Auftraggeber', checked: offerte.checkboxen.dokumentation.datenabgabe },
              ]}
              onChange={(key, value) => updateCheckbox('dokumentation', key, value)}
            />
          </div>
        </div>
      </div>

      {/* Planbeilage */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          Planbeilage (Situationsplan)
        </h3>
        <PlanUpload
          value={offerte.planbeilage}
          onChange={(planbeilage) => onChange({ ...offerte, planbeilage })}
          gisLink={offerte.planbeilageGisLink || ''}
          onGisLinkChange={(link) => onChange({ ...offerte, planbeilageGisLink: link })}
        />
      </div>
    </div>
  );
}
