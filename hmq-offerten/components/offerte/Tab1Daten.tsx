"use client";

import { useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import CheckboxGruppe from "./CheckboxGruppe";
import PlanUpload from "./PlanUpload";
import { OfferteData, Standort, Ansprechpartner } from "@/lib/types";
import { getStandorte, getAnsprechpartner } from "@/lib/store";

interface Tab1DatenProps {
  offerte: OfferteData;
  updateOfferte: (updates: Partial<OfferteData>) => void;
  onNext: () => void;
}

const anredeOptions = [
  { value: "herr", label: "Herr" },
  { value: "frau", label: "Frau" },
  { value: "firma", label: "Firma" },
];

export default function Tab1Daten({ offerte, updateOfferte, onNext }: Tab1DatenProps) {
  const [standorte, setStandorte] = useState<Standort[]>([]);
  const [ansprechpartner, setAnsprechpartner] = useState<Ansprechpartner[]>([]);

  useEffect(() => {
    setStandorte(getStandorte());
    setAnsprechpartner(getAnsprechpartner());
  }, []);

  const filteredAnsprechpartner = offerte.projekt.standortId
    ? ansprechpartner.filter((a) => a.standortId === offerte.projekt.standortId)
    : ansprechpartner;

  const updateEmpfaenger = (field: string, value: string) => {
    updateOfferte({
      empfaenger: { ...offerte.empfaenger, [field]: value },
    });
  };

  const updateProjekt = (field: string, value: string) => {
    const updates: Partial<OfferteData> = {
      projekt: { ...offerte.projekt, [field]: value },
    };
    // Reset Ansprechpartner wenn Standort wechselt
    if (field === "standortId") {
      updates.projekt = { ...updates.projekt!, ansprechpartnerId: "" };
    }
    updateOfferte(updates);
  };

  const toggleLeistung = (id: string) => {
    updateOfferte({
      leistungen: offerte.leistungen.map((l) =>
        l.id === id ? { ...l, checked: !l.checked } : l
      ),
    });
  };

  return (
    <div className="space-y-8">
      {/* Empfänger */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Empfänger</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Firma"
            name="firma"
            value={offerte.empfaenger.firma}
            onChange={(e) => updateEmpfaenger("firma", e.target.value)}
          />
          <Select
            label="Anrede"
            name="anrede"
            value={offerte.empfaenger.anrede}
            onChange={(e) => updateEmpfaenger("anrede", e.target.value)}
            options={anredeOptions}
            placeholder="Bitte wählen"
          />
          <Input
            label="Vorname"
            name="vorname"
            value={offerte.empfaenger.vorname}
            onChange={(e) => updateEmpfaenger("vorname", e.target.value)}
          />
          <Input
            label="Nachname"
            name="nachname"
            value={offerte.empfaenger.nachname}
            onChange={(e) => updateEmpfaenger("nachname", e.target.value)}
          />
          <Input
            label="Strasse"
            name="strasse"
            value={offerte.empfaenger.strasse}
            onChange={(e) => updateEmpfaenger("strasse", e.target.value)}
            className="md:col-span-2"
          />
          <Input
            label="PLZ"
            name="plz"
            value={offerte.empfaenger.plz}
            onChange={(e) => updateEmpfaenger("plz", e.target.value)}
          />
          <Input
            label="Ort"
            name="ort"
            value={offerte.empfaenger.ort}
            onChange={(e) => updateEmpfaenger("ort", e.target.value)}
          />
        </div>
      </section>

      {/* Projekt */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Projekt</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Bezeichnung"
            name="bezeichnung"
            value={offerte.projekt.bezeichnung}
            onChange={(e) => updateProjekt("bezeichnung", e.target.value)}
            className="md:col-span-2"
          />
          <Select
            label="Standort"
            name="standortId"
            value={offerte.projekt.standortId}
            onChange={(e) => updateProjekt("standortId", e.target.value)}
            options={standorte.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Standort wählen"
          />
          <Select
            label="Ansprechpartner"
            name="ansprechpartnerId"
            value={offerte.projekt.ansprechpartnerId}
            onChange={(e) => updateProjekt("ansprechpartnerId", e.target.value)}
            options={filteredAnsprechpartner.map((a) => ({
              value: a.id,
              label: a.name,
            }))}
            placeholder="Ansprechpartner wählen"
          />
        </div>
      </section>

      {/* Leistungen */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Leistungen</h2>
        <CheckboxGruppe
          leistungen={offerte.leistungen}
          onToggle={toggleLeistung}
        />
      </section>

      {/* Plan Upload */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Plan hochladen</h2>
        <PlanUpload
          planBild={offerte.planBild}
          onUpload={(bild) => updateOfferte({ planBild: bild })}
          onRemove={() => updateOfferte({ planBild: undefined })}
        />
      </section>

      {/* Bemerkungen */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Bemerkungen</h2>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={4}
          value={offerte.bemerkungen}
          onChange={(e) => updateOfferte({ bemerkungen: e.target.value })}
          placeholder="Zusätzliche Bemerkungen..."
        />
      </section>

      {/* Navigation */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onNext}>Weiter zu Kosten</Button>
      </div>
    </div>
  );
}
