'use client';

import { Offerte } from '@/lib/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import CheckboxGruppe from './CheckboxGruppe';
import PlanUpload from './PlanUpload';
import FolderImport from './FolderImport';

interface Tab1DatenProps {
  offerte: Offerte;
  onChange: (offerte: Offerte) => void;
  errors?: Record<string, string>;
}

export default function Tab1Daten({ offerte, onChange, errors = {} }: Tab1DatenProps) {
  const updateField = (path: string, value: any) => {
    const keys = path.split('.');
    const newOfferte = JSON.parse(JSON.stringify(offerte));
    let obj: any = newOfferte;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    onChange(newOfferte);
  };

  const updateCheckbox = (group: string, key: string, value: boolean | string) => {
    const newCheckboxen = JSON.parse(JSON.stringify(offerte.checkboxen));
    (newCheckboxen as any)[group][key] = value;
    onChange({ ...offerte, checkboxen: newCheckboxen });
  };

  return (
    <div className="space-y-8">
      {/* Ordner-Import */}
      <FolderImport offerte={offerte} onChange={onChange} />

      {/* Basis-Daten */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Offert-Grunddaten</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Offertnummer"
            placeholder="51.25.405"
            value={offerte.offertnummer}
            onChange={(e) => updateField('offertnummer', e.target.value)}
            error={errors.offertnummer}
            required
          />
          <Input
            label="Offertdatum"
            type="date"
            value={offerte.datum}
            onChange={(e) => updateField('datum', e.target.value)}
            required
          />
          <Select
            label="HMQ Standort"
            value={offerte.standortId}
            onChange={(e) => updateField('standortId', e.target.value)}
            options={[
              { value: 'zh', label: 'Zürich-Opfikon' },
              { value: 'gr', label: 'Chur' },
              { value: 'ag', label: 'Zofingen' },
            ]}
            required
          />
        </div>
      </section>

      {/* Empfänger */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Empfänger</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Firma"
              placeholder="Müller Bau AG"
              value={offerte.empfaenger.firma}
              onChange={(e) => updateField('empfaenger.firma', e.target.value)}
              error={errors['empfaenger.firma']}
              required
            />
          </div>

          <Select
            label="Kontaktperson"
            value={offerte.empfaenger.anrede}
            onChange={(e) => updateField('empfaenger.anrede', e.target.value)}
            options={[
              { value: '', label: '— Keine Kontaktperson —' },
              { value: 'Herr', label: 'Herr' },
              { value: 'Frau', label: 'Frau' },
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Vorname"
              value={offerte.empfaenger.vorname}
              onChange={(e) => updateField('empfaenger.vorname', e.target.value)}
              disabled={!offerte.empfaenger.anrede}
            />
            <Input
              label="Nachname"
              value={offerte.empfaenger.nachname}
              onChange={(e) => updateField('empfaenger.nachname', e.target.value)}
              disabled={!offerte.empfaenger.anrede}
            />
          </div>

          <Input
            label="Funktion / Titel"
            placeholder="dipl. Ingenieur ETH/SIA"
            value={offerte.empfaenger.funktion}
            onChange={(e) => updateField('empfaenger.funktion', e.target.value)}
            disabled={!offerte.empfaenger.anrede}
          />

          <div></div>

          <Input
            label="Strasse"
            value={offerte.empfaenger.strasse}
            onChange={(e) => updateField('empfaenger.strasse', e.target.value)}
            error={errors['empfaenger.strasse']}
            required
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="PLZ"
              value={offerte.empfaenger.plz}
              onChange={(e) => updateField('empfaenger.plz', e.target.value)}
              error={errors['empfaenger.plz']}
              required
            />
            <div className="col-span-2">
              <Input
                label="Ort"
                value={offerte.empfaenger.ort}
                onChange={(e) => updateField('empfaenger.ort', e.target.value)}
                error={errors['empfaenger.ort']}
                required
              />
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">PLZ wird automatisch mit "CH-" ergänzt</p>
      </section>

      {/* Projekt */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Projekt</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="Projektort"
            value={offerte.projekt.ort}
            onChange={(e) => updateField('projekt.ort', e.target.value)}
            error={errors['projekt.ort']}
            required
          />
          <div className="lg:col-span-2">
            <Input
              label="Projektbezeichnung"
              placeholder="Wehntalerstrasse 47, Neubau MFH"
              value={offerte.projekt.bezeichnung}
              onChange={(e) => updateField('projekt.bezeichnung', e.target.value)}
              error={errors['projekt.bezeichnung']}
              required
            />
          </div>
          <Input
            label="Anfragedatum"
            type="date"
            value={offerte.projekt.anfrageDatum}
            onChange={(e) => updateField('projekt.anfrageDatum', e.target.value)}
          />
          <Select
            label="Vorlaufzeit"
            value={offerte.vorlaufzeit}
            onChange={(e) => updateField('vorlaufzeit', e.target.value)}
            options={[
              { value: '2 Wochen', label: '2 Wochen' },
              { value: '3 Wochen', label: '3 Wochen' },
              { value: '4 Wochen', label: '4 Wochen' },
              { value: '6 Wochen', label: '6 Wochen' },
            ]}
          />
          <Select
            label="Einsatzpauschalen"
            value={offerte.einsatzpauschalen.toString()}
            onChange={(e) => updateField('einsatzpauschalen', parseInt(e.target.value))}
            options={[
              { value: '1', label: '1 Einsatz (1 Tag)' },
              { value: '2', label: '2 Einsätze (2 Tage)' },
              { value: '3', label: '3 Einsätze (3 Tage)' },
              { value: '4', label: '4 Einsätze (4 Tage)' },
            ]}
          />
        </div>
      </section>

      {/* === CHECKBOXEN === */}

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">1.1 Art des Bauvorhabens</h3>
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
        <div className="mt-4">
          <CheckboxGruppe
            titel="Art der Gebäude"
            checkboxen={[
              { key: 'efhFreistehend', label: 'Einfamilienhäuser freistehend', checked: offerte.checkboxen.artGebaeude.efhFreistehend },
              { key: 'reihenhaus', label: 'Reihenhäuser', checked: offerte.checkboxen.artGebaeude.reihenhaus },
              { key: 'terrassenhaus', label: 'Terrassenhäuser', checked: offerte.checkboxen.artGebaeude.terrassenhaus },
              { key: 'mfh', label: 'Mehrfamilienhäuser', checked: offerte.checkboxen.artGebaeude.mfh },
              { key: 'strassen', label: 'Strassen', checked: offerte.checkboxen.artGebaeude.strassen },
              { key: 'kunstbauten', label: 'Kunstbauten', checked: offerte.checkboxen.artGebaeude.kunstbauten },
            ]}
            onChange={(key, value) => updateCheckbox('artGebaeude', key, value)}
          />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">1.2 Tätigkeiten</h3>
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
        />
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">2.1 Koordination mit den Eigentümern</h3>
        <CheckboxGruppe
          titel="Koordination"
          checkboxen={[
            { key: 'schriftlicheInfo', label: 'schriftliche Eigentümerinformation', checked: offerte.checkboxen.koordination.schriftlicheInfo },
            { key: 'terminvereinbarung', label: 'Terminvereinbarung mit den betroffenen Eigentümern', checked: offerte.checkboxen.koordination.terminvereinbarung },
            { key: 'durchAuftraggeber', label: 'durch den Auftraggeber', checked: offerte.checkboxen.koordination.durchAuftraggeber },
          ]}
          onChange={(key, value) => updateCheckbox('koordination', key, value)}
        />
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">2.2 Beweissicherung Erstaufnahme</h3>
        <CheckboxGruppe
          titel="Zu dokumentierende Objekte"
          checkboxen={[
            { key: 'fassaden', label: 'Fassaden', checked: offerte.checkboxen.erstaufnahme.fassaden },
            { key: 'strassen', label: 'Strassen', checked: offerte.checkboxen.erstaufnahme.strassen },
            { key: 'strassenBelag', label: 'Belagszustand', checked: offerte.checkboxen.erstaufnahme.strassenBelag },
            { key: 'strassenRand', label: 'Randabschlüsse', checked: offerte.checkboxen.erstaufnahme.strassenRand },
            { key: 'innenraeume', label: 'Innenräume', checked: offerte.checkboxen.erstaufnahme.innenraeume },
            { key: 'aussenanlagen', label: 'Aussenanlagen', checked: offerte.checkboxen.erstaufnahme.aussenanlagen },
          ]}
          onChange={(key, value) => updateCheckbox('erstaufnahme', key, value)}
        />
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">2.3 Dokumentation/Datenabgabe</h3>
        <CheckboxGruppe
          titel="Berichtinhalt pro Parzelle"
          checkboxen={[
            { key: 'rissprotokoll', label: 'Rissprotokoll', checked: offerte.checkboxen.dokumentation.rissprotokoll },
            { key: 'fotoAussen', label: 'Fotodokumentation Aussen', checked: offerte.checkboxen.dokumentation.fotoAussen },
            { key: 'fotoInnen', label: 'Fotodokumentation Innen', checked: offerte.checkboxen.dokumentation.fotoInnen },
            { key: 'fotoStrasse', label: 'Fotodokumentation Strassenzustand', checked: offerte.checkboxen.dokumentation.fotoStrasse },
            { key: 'zustellbestaetigung', label: 'Zustellbestätigung', checked: offerte.checkboxen.dokumentation.zustellbestaetigung },
            { key: 'datenabgabe', label: 'Datenabgabe Auftraggeber', checked: offerte.checkboxen.dokumentation.datenabgabe },
          ]}
          onChange={(key, value) => updateCheckbox('dokumentation', key, value)}
        />
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Planbeilage</h3>
        <PlanUpload
          value={offerte.planbeilage}
          onChange={(planbeilage) => onChange({ ...offerte, planbeilage })}
        />
      </section>
    </div>
  );
}
