"use client";

import { useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import PlanUpload from "./PlanUpload";
import { Offerte, Standort, Ansprechpartner, CheckboxSelektion } from "@/lib/types";
import { getStandorte, getAnsprechpartner } from "@/lib/store";

interface Tab1DatenProps {
  offerte: Offerte;
  updateOfferte: (updates: Partial<Offerte>) => void;
  onNext: () => void;
}

const anredeOptions = [
  { value: "Herr", label: "Herr" },
  { value: "Frau", label: "Frau" },
  { value: "Firma", label: "Firma" },
];

export default function Tab1Daten({ offerte, updateOfferte, onNext }: Tab1DatenProps) {
  const [standorte, setStandorte] = useState<Standort[]>([]);
  const [ansprechpartnerListe, setAnsprechpartnerListe] = useState<Ansprechpartner[]>([]);

  useEffect(() => {
    setStandorte(getStandorte());
    setAnsprechpartnerListe(getAnsprechpartner());
  }, []);

  const updateEmpfaenger = (field: string, value: string) => {
    updateOfferte({
      empfaenger: { ...offerte.empfaenger, [field]: value },
    });
  };

  const updateProjekt = (field: string, value: string) => {
    updateOfferte({
      projekt: { ...offerte.projekt, [field]: value },
    });
  };

  const updateCheckbox = <T extends keyof CheckboxSelektion>(
    gruppe: T,
    field: keyof CheckboxSelektion[T],
    value: boolean | string
  ) => {
    updateOfferte({
      checkboxen: {
        ...offerte.checkboxen,
        [gruppe]: {
          ...offerte.checkboxen[gruppe],
          [field]: value,
        },
      },
    });
  };

  const toggleAnsprechpartner = (id: string) => {
    const current = offerte.ansprechpartnerIds;
    const updated = current.includes(id)
      ? current.filter((apId) => apId !== id)
      : [...current, id];
    updateOfferte({ ansprechpartnerIds: updated });
  };

  return (
    <div className="space-y-8">
      {/* Meta */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Offerte</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Offertnummer"
            value={offerte.offertnummer}
            onChange={(e) => updateOfferte({ offertnummer: e.target.value })}
            placeholder="51.25.XXX"
          />
          <Input
            label="Datum"
            type="date"
            value={offerte.datum}
            onChange={(e) => updateOfferte({ datum: e.target.value })}
          />
          <Select
            label="Standort"
            value={offerte.standortId}
            onChange={(e) => updateOfferte({ standortId: e.target.value })}
            options={standorte.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Standort wählen"
          />
        </div>
      </section>

      {/* Ansprechpartner */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Ansprechpartner (für Unterschrift)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ansprechpartnerListe.map((ap) => (
            <Checkbox
              key={ap.id}
              label={`${ap.vorname} ${ap.nachname}`}
              checked={offerte.ansprechpartnerIds.includes(ap.id)}
              onChange={() => toggleAnsprechpartner(ap.id)}
            />
          ))}
        </div>
      </section>

      {/* Empfänger */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Empfänger</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Anrede"
            value={offerte.empfaenger.anrede}
            onChange={(e) => updateEmpfaenger("anrede", e.target.value)}
            options={anredeOptions}
            placeholder="Bitte wählen"
          />
          <Input
            label="Name / Firma"
            value={offerte.empfaenger.name}
            onChange={(e) => updateEmpfaenger("name", e.target.value)}
          />
          <Input
            label="Zusatz (c/o etc.)"
            value={offerte.empfaenger.zusatz}
            onChange={(e) => updateEmpfaenger("zusatz", e.target.value)}
          />
          <Input
            label="Strasse"
            value={offerte.empfaenger.strasse}
            onChange={(e) => updateEmpfaenger("strasse", e.target.value)}
          />
          <Input
            label="PLZ / Ort"
            value={offerte.empfaenger.plzOrt}
            onChange={(e) => updateEmpfaenger("plzOrt", e.target.value)}
            placeholder="8000 Zürich"
            className="md:col-span-2"
          />
        </div>
      </section>

      {/* Projekt */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Projekt</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Ort"
            value={offerte.projekt.ort}
            onChange={(e) => updateProjekt("ort", e.target.value)}
          />
          <Input
            label="Bezeichnung"
            value={offerte.projekt.bezeichnung}
            onChange={(e) => updateProjekt("bezeichnung", e.target.value)}
          />
          <Input
            label="Anfragedatum"
            type="date"
            value={offerte.projekt.anfrageDatum}
            onChange={(e) => updateProjekt("anfrageDatum", e.target.value)}
          />
        </div>
      </section>

      {/* 1.1 Art des Bauvorhabens */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">1.1 Art des Bauvorhabens</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Checkbox
            label="Neubau"
            checked={offerte.checkboxen.artBauvorhaben.neubau}
            onChange={() => updateCheckbox("artBauvorhaben", "neubau", !offerte.checkboxen.artBauvorhaben.neubau)}
          />
          <Checkbox
            label="Umbau"
            checked={offerte.checkboxen.artBauvorhaben.umbau}
            onChange={() => updateCheckbox("artBauvorhaben", "umbau", !offerte.checkboxen.artBauvorhaben.umbau)}
          />
          <Checkbox
            label="Rückbau"
            checked={offerte.checkboxen.artBauvorhaben.rueckbau}
            onChange={() => updateCheckbox("artBauvorhaben", "rueckbau", !offerte.checkboxen.artBauvorhaben.rueckbau)}
          />
          <Input
            label="Sonstiges"
            value={offerte.checkboxen.artBauvorhaben.sonstiges}
            onChange={(e) => updateCheckbox("artBauvorhaben", "sonstiges", e.target.value)}
          />
        </div>
      </section>

      {/* 1.1 Art des Gebäudes */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">1.1 Art des Gebäudes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Checkbox
            label="EFH freistehend"
            checked={offerte.checkboxen.artGebaeude.efhFreistehend}
            onChange={() => updateCheckbox("artGebaeude", "efhFreistehend", !offerte.checkboxen.artGebaeude.efhFreistehend)}
          />
          <Checkbox
            label="Reihenhaus"
            checked={offerte.checkboxen.artGebaeude.reihenhaus}
            onChange={() => updateCheckbox("artGebaeude", "reihenhaus", !offerte.checkboxen.artGebaeude.reihenhaus)}
          />
          <Checkbox
            label="Terrassenhaus"
            checked={offerte.checkboxen.artGebaeude.terrassenhaus}
            onChange={() => updateCheckbox("artGebaeude", "terrassenhaus", !offerte.checkboxen.artGebaeude.terrassenhaus)}
          />
          <Checkbox
            label="MFH"
            checked={offerte.checkboxen.artGebaeude.mfh}
            onChange={() => updateCheckbox("artGebaeude", "mfh", !offerte.checkboxen.artGebaeude.mfh)}
          />
          <Checkbox
            label="Strassen"
            checked={offerte.checkboxen.artGebaeude.strassen}
            onChange={() => updateCheckbox("artGebaeude", "strassen", !offerte.checkboxen.artGebaeude.strassen)}
          />
          <Checkbox
            label="Kunstbauten"
            checked={offerte.checkboxen.artGebaeude.kunstbauten}
            onChange={() => updateCheckbox("artGebaeude", "kunstbauten", !offerte.checkboxen.artGebaeude.kunstbauten)}
          />
          <Input
            label="Sonstiges 1"
            value={offerte.checkboxen.artGebaeude.sonstiges1}
            onChange={(e) => updateCheckbox("artGebaeude", "sonstiges1", e.target.value)}
          />
          <Input
            label="Sonstiges 2"
            value={offerte.checkboxen.artGebaeude.sonstiges2}
            onChange={(e) => updateCheckbox("artGebaeude", "sonstiges2", e.target.value)}
          />
        </div>
      </section>

      {/* 1.2 Tätigkeiten */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">1.2 Tätigkeiten</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Checkbox
            label="Aushub"
            checked={offerte.checkboxen.taetigkeiten.aushub}
            onChange={() => updateCheckbox("taetigkeiten", "aushub", !offerte.checkboxen.taetigkeiten.aushub)}
          />
          <Checkbox
            label="Rammarbeiten"
            checked={offerte.checkboxen.taetigkeiten.rammarbeiten}
            onChange={() => updateCheckbox("taetigkeiten", "rammarbeiten", !offerte.checkboxen.taetigkeiten.rammarbeiten)}
          />
          <Checkbox
            label="Mikropfähle"
            checked={offerte.checkboxen.taetigkeiten.mikropfaehle}
            onChange={() => updateCheckbox("taetigkeiten", "mikropfaehle", !offerte.checkboxen.taetigkeiten.mikropfaehle)}
          />
          <Checkbox
            label="Baustellenverkehr"
            checked={offerte.checkboxen.taetigkeiten.baustellenverkehr}
            onChange={() => updateCheckbox("taetigkeiten", "baustellenverkehr", !offerte.checkboxen.taetigkeiten.baustellenverkehr)}
          />
          <Checkbox
            label="Schwere Maschinen"
            checked={offerte.checkboxen.taetigkeiten.schwereMaschinen}
            onChange={() => updateCheckbox("taetigkeiten", "schwereMaschinen", !offerte.checkboxen.taetigkeiten.schwereMaschinen)}
          />
          <Checkbox
            label="Sprengungen"
            checked={offerte.checkboxen.taetigkeiten.sprengungen}
            onChange={() => updateCheckbox("taetigkeiten", "sprengungen", !offerte.checkboxen.taetigkeiten.sprengungen)}
          />
          <Checkbox
            label="Diverses"
            checked={offerte.checkboxen.taetigkeiten.diverses}
            onChange={() => updateCheckbox("taetigkeiten", "diverses", !offerte.checkboxen.taetigkeiten.diverses)}
          />
          <Input
            label="Sonstiges"
            value={offerte.checkboxen.taetigkeiten.sonstiges}
            onChange={(e) => updateCheckbox("taetigkeiten", "sonstiges", e.target.value)}
          />
        </div>
      </section>

      {/* 2.1 Koordination */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">2.1 Koordination</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Checkbox
            label="Schriftliche Info"
            checked={offerte.checkboxen.koordination.schriftlicheInfo}
            onChange={() => updateCheckbox("koordination", "schriftlicheInfo", !offerte.checkboxen.koordination.schriftlicheInfo)}
          />
          <Checkbox
            label="Terminvereinbarung"
            checked={offerte.checkboxen.koordination.terminvereinbarung}
            onChange={() => updateCheckbox("koordination", "terminvereinbarung", !offerte.checkboxen.koordination.terminvereinbarung)}
          />
          <Checkbox
            label="Durch Auftraggeber"
            checked={offerte.checkboxen.koordination.durchAuftraggeber}
            onChange={() => updateCheckbox("koordination", "durchAuftraggeber", !offerte.checkboxen.koordination.durchAuftraggeber)}
          />
          <Input
            label="Sonstiges"
            value={offerte.checkboxen.koordination.sonstiges}
            onChange={(e) => updateCheckbox("koordination", "sonstiges", e.target.value)}
          />
        </div>
      </section>

      {/* 2.2 Erstaufnahme */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">2.2 Erstaufnahme</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Checkbox
            label="Fassaden"
            checked={offerte.checkboxen.erstaufnahme.fassaden}
            onChange={() => updateCheckbox("erstaufnahme", "fassaden", !offerte.checkboxen.erstaufnahme.fassaden)}
          />
          <Checkbox
            label="Strassen"
            checked={offerte.checkboxen.erstaufnahme.strassen}
            onChange={() => updateCheckbox("erstaufnahme", "strassen", !offerte.checkboxen.erstaufnahme.strassen)}
          />
          <Checkbox
            label="Strassen (Belag)"
            checked={offerte.checkboxen.erstaufnahme.strassenBelag}
            onChange={() => updateCheckbox("erstaufnahme", "strassenBelag", !offerte.checkboxen.erstaufnahme.strassenBelag)}
          />
          <Checkbox
            label="Strassen (Rand)"
            checked={offerte.checkboxen.erstaufnahme.strassenRand}
            onChange={() => updateCheckbox("erstaufnahme", "strassenRand", !offerte.checkboxen.erstaufnahme.strassenRand)}
          />
          <Checkbox
            label="Innenräume"
            checked={offerte.checkboxen.erstaufnahme.innenraeume}
            onChange={() => updateCheckbox("erstaufnahme", "innenraeume", !offerte.checkboxen.erstaufnahme.innenraeume)}
          />
          <Checkbox
            label="Aussenanlagen"
            checked={offerte.checkboxen.erstaufnahme.aussenanlagen}
            onChange={() => updateCheckbox("erstaufnahme", "aussenanlagen", !offerte.checkboxen.erstaufnahme.aussenanlagen)}
          />
          <Input
            label="Sonstiges"
            value={offerte.checkboxen.erstaufnahme.sonstiges}
            onChange={(e) => updateCheckbox("erstaufnahme", "sonstiges", e.target.value)}
            className="md:col-span-2"
          />
        </div>
      </section>

      {/* 2.3 Dokumentation */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">2.3 Dokumentation</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Checkbox
            label="Rissprotokoll"
            checked={offerte.checkboxen.dokumentation.rissprotokoll}
            onChange={() => updateCheckbox("dokumentation", "rissprotokoll", !offerte.checkboxen.dokumentation.rissprotokoll)}
          />
          <Checkbox
            label="Foto Aussen"
            checked={offerte.checkboxen.dokumentation.fotoAussen}
            onChange={() => updateCheckbox("dokumentation", "fotoAussen", !offerte.checkboxen.dokumentation.fotoAussen)}
          />
          <Checkbox
            label="Foto Innen"
            checked={offerte.checkboxen.dokumentation.fotoInnen}
            onChange={() => updateCheckbox("dokumentation", "fotoInnen", !offerte.checkboxen.dokumentation.fotoInnen)}
          />
          <Checkbox
            label="Foto Strasse"
            checked={offerte.checkboxen.dokumentation.fotoStrasse}
            onChange={() => updateCheckbox("dokumentation", "fotoStrasse", !offerte.checkboxen.dokumentation.fotoStrasse)}
          />
          <Checkbox
            label="Zustellbestätigung"
            checked={offerte.checkboxen.dokumentation.zustellbestaetigung}
            onChange={() => updateCheckbox("dokumentation", "zustellbestaetigung", !offerte.checkboxen.dokumentation.zustellbestaetigung)}
          />
          <Checkbox
            label="Datenabgabe"
            checked={offerte.checkboxen.dokumentation.datenabgabe}
            onChange={() => updateCheckbox("dokumentation", "datenabgabe", !offerte.checkboxen.dokumentation.datenabgabe)}
          />
        </div>
      </section>

      {/* Planbeilage */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Planbeilage</h2>
        <PlanUpload
          planbeilage={offerte.planbeilage}
          onUpload={(planbeilage) => updateOfferte({ planbeilage })}
          onRemove={() => updateOfferte({ planbeilage: null })}
        />
      </section>

      {/* Vorlaufzeit */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Termine</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Vorlaufzeit"
            value={offerte.vorlaufzeit}
            onChange={(e) => updateOfferte({ vorlaufzeit: e.target.value })}
            placeholder="z.B. 3 Wochen"
          />
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onNext}>Weiter zu Kosten</Button>
      </div>
    </div>
  );
}
