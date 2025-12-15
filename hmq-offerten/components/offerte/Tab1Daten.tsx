'use client';

import { useEffect, useState } from 'react';
import { Offerte, Standort, Ansprechpartner } from '@/lib/types';
import { getStandorte, getAnsprechpartner } from '@/lib/store';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import CheckboxGruppe from './CheckboxGruppe';
import PlanUpload from './PlanUpload';

interface Tab1DatenProps {
  offerte: Offerte;
  onChange: (offerte: Offerte) => void;
  errors: Record<string, string>;
}

export default function Tab1Daten({ offerte, onChange, errors }: Tab1DatenProps) {
  const [standorte, setStandorte] = useState<Standort[]>([]);
  const [ansprechpartner, setAnsprechpartner] = useState<Ansprechpartner[]>([]);

  useEffect(() => {
    setStandorte(getStandorte());
    setAnsprechpartner(getAnsprechpartner());
  }, []);

  const updateField = <K extends keyof Offerte>(key: K, value: Offerte[K]) => {
    onChange({ ...offerte, [key]: value });
  };

  const updateEmpfaenger = (field: string, value: string) => {
    onChange({
      ...offerte,
      empfaenger: { ...offerte.empfaenger, [field]: value },
    });
  };

  const updateProjekt = (field: string, value: string) => {
    onChange({
      ...offerte,
      projekt: { ...offerte.projekt, [field]: value },
    });
  };

  const updateCheckbox = (kategorie: string, key: string, value: boolean | string) => {
    onChange({
      ...offerte,
      checkboxen: {
        ...offerte.checkboxen,
        [kategorie]: {
          ...(offerte.checkboxen as any)[kategorie],
          [key]: value,
        },
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* === META === */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Offert-Daten</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Standort"
            value={offerte.standortId}
            onChange={(e) => updateField('standortId', e.target.value)}
            options={standorte.map(s => ({ value: s.id, label: `${s.plzOrt}` }))}
            required
          />
          <Input
            label="Offertnummer"
            placeholder="51.25.XXX"
            value={offerte.offertnummer}
            onChange={(e) => updateField('offertnummer', e.target.value)}
            error={errors.offertnummer}
            required
          />
          <Input
            label="Datum"
            type="date"
            value={offerte.datum}
            onChange={(e) => updateField('datum', e.target.value)}
            required
          />
        </div>
      </section>

      {/* === EMPFÄNGER === */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Empfänger</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Firma"
              placeholder="z.B. Müller Bau AG"
              value={offerte.empfaenger.firma}
              onChange={(e) => updateEmpfaenger('firma', e.target.value)}
              error={errors['empfaenger.firma']}
              required
            />
          </div>

          <Select
            label="Anrede Kontaktperson"
            value={offerte.empfaenger.anrede}
            onChange={(e) => updateEmpfaenger('anrede', e.target.value)}
            options={[
              { value: '', label: '— Keine Kontaktperson —' },
              { value: 'Herr', label: 'Herr' },
              { value: 'Frau', label: 'Frau' },
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Vorname"
              placeholder="Max"
              value={offerte.empfaenger.vorname}
              onChange={(e) => updateEmpfaenger('vorname', e.target.value)}
              disabled={!offerte.empfaenger.anrede}
            />
            <Input
              label="Nachname"
              placeholder="Mustermann"
              value={offerte.empfaenger.nachname}
              onChange={(e) => updateEmpfaenger('nachname', e.target.value)}
              disabled={!offerte.empfaenger.anrede}
            />
          </div>

          <Input
            label="Funktion / Titel"
            placeholder="z.B. dipl. Ingenieur ETH/SIA"
            value={offerte.empfaenger.funktion}
            onChange={(e) => updateEmpfaenger('funktion', e.target.value)}
            disabled={!offerte.empfaenger.anrede}
          />

          <div></div>

          <Input
            label="Strasse, Nr."
            value={offerte.empfaenger.strasse}
            onChange={(e) => updateEmpfaenger('strasse', e.target.value)}
            error={errors['empfaenger.strasse']}
            required
          />
          <Input
            label="PLZ, Ort"
            placeholder="z.B. 8000 Zürich"
            value={offerte.empfaenger.plzOrt}
            onChange={(e) => updateEmpfaenger('plzOrt', e.target.value)}
            error={errors['empfaenger.plzOrt']}
            required
          />
        </div>
      </section>

      {/* === PROJEKT === */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Projekt</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="Projektort"
            placeholder="Zürich"
            value={offerte.projekt.ort}
            onChange={(e) => updateProjekt('ort', e.target.value)}
            error={errors['projekt.ort']}
            required
          />
          <div className="lg:col-span-2">
            <Input
              label="Projektbezeichnung"
              placeholder="Neubau MFH Wehntalerstrasse 47"
              value={offerte.projekt.bezeichnung}
              onChange={(e) => updateProjekt('bezeichnung', e.target.value)}
              error={errors['projekt.bezeichnung']}
              required
            />
          </div>
          <Input
            label="Anfragedatum"
            type="date"
            value={offerte.projekt.anfrageDatum}
            onChange={(e) => updateProjekt('anfrageDatum', e.target.value)}
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
              { value: '1', label: '1 Einsatz (max. 1 Tag)' },
              { value: '2', label: '2 Einsätze (max. 2 Tage)' },
              { value: '3', label: '3 Einsätze (max. 3 Tage)' },
              { value: '4', label: '4 Einsätze (max. 4 Tage)' },
            ]}
          />
        </div>
      </section>

      {/* === CHECKBOXEN === */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Leistungen</h2>

        <CheckboxGruppe
          titel="1.1 Art des Bauvorhabens"
          checkboxen={[
            { key: 'neubau', label: 'Neubau', checked: offerte.checkboxen.artBauvorhaben.neubau },
            { key: 'umbau', label: 'Umbau', checked: offerte.checkboxen.artBauvorhaben.umbau },
            { key: 'rueckbau', label: 'Rückbau', checked: offerte.checkboxen.artBauvorhaben.rueckbau },
          ]}
          sonstigesItems={[
            { key: 'sonstiges', value: offerte.checkboxen.artBauvorhaben.sonstiges, placeholder: 'Sonstiges...' },
          ]}
          onChange={(key, val) => updateCheckbox('artBauvorhaben', key, val)}
          onSonstigesChange={(key, val) => updateCheckbox('artBauvorhaben', key, val)}
        />

        <CheckboxGruppe
          titel="Art des Gebäudes"
          checkboxen={[
            { key: 'efhFreistehend', label: 'Einfamilienhäuser freistehend', checked: offerte.checkboxen.artGebaeude.efhFreistehend },
            { key: 'reihenhaus', label: 'Reihenhäuser', checked: offerte.checkboxen.artGebaeude.reihenhaus },
            { key: 'terrassenhaus', label: 'Terrassenhäuser', checked: offerte.checkboxen.artGebaeude.terrassenhaus },
            { key: 'mfh', label: 'Mehrfamilienhäuser', checked: offerte.checkboxen.artGebaeude.mfh },
            { key: 'strassen', label: 'Strassen', checked: offerte.checkboxen.artGebaeude.strassen },
            { key: 'kunstbauten', label: 'Kunstbauten', checked: offerte.checkboxen.artGebaeude.kunstbauten },
          ]}
          sonstigesItems={[
            { key: 'sonstiges1', value: offerte.checkboxen.artGebaeude.sonstiges1, placeholder: 'Sonstiges 1...' },
            { key: 'sonstiges2', value: offerte.checkboxen.artGebaeude.sonstiges2, placeholder: 'Sonstiges 2...' },
          ]}
          onChange={(key, val) => updateCheckbox('artGebaeude', key, val)}
          onSonstigesChange={(key, val) => updateCheckbox('artGebaeude', key, val)}
        />

        <CheckboxGruppe
          titel="1.2 Tätigkeiten, die Erschütterungen erzeugen können"
          checkboxen={[
            { key: 'aushub', label: 'Aushubarbeiten', checked: offerte.checkboxen.taetigkeiten.aushub },
            { key: 'rammarbeiten', label: 'Rammarbeiten (Spund-/Rühlwände)', checked: offerte.checkboxen.taetigkeiten.rammarbeiten },
            { key: 'mikropfaehle', label: 'Mikropfähle / Anker setzen', checked: offerte.checkboxen.taetigkeiten.mikropfaehle },
            { key: 'baustellenverkehr', label: 'Baustellenverkehr', checked: offerte.checkboxen.taetigkeiten.baustellenverkehr },
            { key: 'schwereMaschinen', label: 'Schwere Maschinen', checked: offerte.checkboxen.taetigkeiten.schwereMaschinen },
            { key: 'sprengungen', label: 'Sprengungen', checked: offerte.checkboxen.taetigkeiten.sprengungen },
            { key: 'diverses', label: 'Diverses', checked: offerte.checkboxen.taetigkeiten.diverses },
          ]}
          sonstigesItems={[
            { key: 'sonstiges', value: offerte.checkboxen.taetigkeiten.sonstiges, placeholder: 'Sonstiges...' },
          ]}
          onChange={(key, val) => updateCheckbox('taetigkeiten', key, val)}
          onSonstigesChange={(key, val) => updateCheckbox('taetigkeiten', key, val)}
        />

        <CheckboxGruppe
          titel="2.1 Koordination mit den Eigentümern"
          checkboxen={[
            { key: 'schriftlicheInfo', label: 'Schriftliche Eigentümerinformation', checked: offerte.checkboxen.koordination.schriftlicheInfo },
            { key: 'terminvereinbarung', label: 'Terminvereinbarung mit Eigentümern', checked: offerte.checkboxen.koordination.terminvereinbarung },
            { key: 'durchAuftraggeber', label: 'Info/Termin durch Auftraggeber', checked: offerte.checkboxen.koordination.durchAuftraggeber },
          ]}
          sonstigesItems={[
            { key: 'sonstiges', value: offerte.checkboxen.koordination.sonstiges, placeholder: 'Sonstiges...' },
          ]}
          onChange={(key, val) => updateCheckbox('koordination', key, val)}
          onSonstigesChange={(key, val) => updateCheckbox('koordination', key, val)}
        />

        <CheckboxGruppe
          titel="2.2 Beweissicherung Erstaufnahme"
          untertitel="Objekte gemäss Planbeilage"
          checkboxen={[
            { key: 'fassaden', label: 'Fassaden', checked: offerte.checkboxen.erstaufnahme.fassaden },
            { key: 'strassen', label: 'Strassen', checked: offerte.checkboxen.erstaufnahme.strassen },
            { key: 'strassenBelag', label: '↳ Belagszustand', checked: offerte.checkboxen.erstaufnahme.strassenBelag },
            { key: 'strassenRand', label: '↳ Randabschlüsse', checked: offerte.checkboxen.erstaufnahme.strassenRand },
            { key: 'innenraeume', label: 'Innenräume', checked: offerte.checkboxen.erstaufnahme.innenraeume },
            { key: 'aussenanlagen', label: 'Aussenanlagen', checked: offerte.checkboxen.erstaufnahme.aussenanlagen },
          ]}
          sonstigesItems={[
            { key: 'sonstiges', value: offerte.checkboxen.erstaufnahme.sonstiges, placeholder: 'Sonstiges...' },
          ]}
          onChange={(key, val) => updateCheckbox('erstaufnahme', key, val)}
          onSonstigesChange={(key, val) => updateCheckbox('erstaufnahme', key, val)}
        />

        <CheckboxGruppe
          titel="2.3 Dokumentation / Datenabgabe"
          checkboxen={[
            { key: 'rissprotokoll', label: 'Rissprotokoll', checked: offerte.checkboxen.dokumentation.rissprotokoll },
            { key: 'fotoAussen', label: 'Fotodokumentation Aussen', checked: offerte.checkboxen.dokumentation.fotoAussen },
            { key: 'fotoInnen', label: 'Fotodokumentation Innen', checked: offerte.checkboxen.dokumentation.fotoInnen },
            { key: 'fotoStrasse', label: 'Fotodokumentation Strasse', checked: offerte.checkboxen.dokumentation.fotoStrasse },
            { key: 'zustellbestaetigung', label: 'Zustellbestätigung', checked: offerte.checkboxen.dokumentation.zustellbestaetigung },
            { key: 'datenabgabe', label: 'Datenabgabe Auftraggeber', checked: offerte.checkboxen.dokumentation.datenabgabe },
          ]}
          onChange={(key, val) => updateCheckbox('dokumentation', key, val)}
        />
      </section>

      {/* === PLANBEILAGE === */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Planbeilage</h2>
        <PlanUpload
          value={offerte.planbeilage}
          onChange={(plan) => updateField('planbeilage', plan)}
        />
      </section>
    </div>
  );
}
