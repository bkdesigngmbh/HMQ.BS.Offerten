"use client";

import { useMemo, useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Offerte, Ansprechpartner, Standort } from "@/lib/types";
import { getAnsprechpartner, getStandorte } from "@/lib/store";
import Image from "next/image";

interface Tab2KostenProps {
  offerte: Offerte;
  updateOfferte: (updates: Partial<Offerte>) => void;
  onBack: () => void;
}

const MWST_SATZ = 0.081; // 8.1% MwSt

export default function Tab2Kosten({ offerte, updateOfferte, onBack }: Tab2KostenProps) {
  const [ansprechpartnerListe, setAnsprechpartnerListe] = useState<Ansprechpartner[]>([]);
  const [standorte, setStandorte] = useState<Standort[]>([]);

  useEffect(() => {
    setAnsprechpartnerListe(getAnsprechpartner());
    setStandorte(getStandorte());
  }, []);

  const updateKosten = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateOfferte({
      kosten: { ...offerte.kosten, [field]: numValue },
    });
  };

  const berechnungen = useMemo(() => {
    const { leistungspreis, rabattProzent } = offerte.kosten;
    const rabattBetrag = (leistungspreis * rabattProzent) / 100;
    const netto = leistungspreis - rabattBetrag;
    const mwst = netto * MWST_SATZ;
    const total = netto + mwst;

    return {
      rabattBetrag,
      netto,
      mwst,
      total,
    };
  }, [offerte.kosten]);

  const selectedAnsprechpartner = ansprechpartnerListe.filter((ap) =>
    offerte.ansprechpartnerIds.includes(ap.id)
  );

  const selectedStandort = standorte.find((s) => s.id === offerte.standortId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "–";
    const date = new Date(dateStr);
    return date.toLocaleDateString("de-CH");
  };

  const handleSubmit = () => {
    // Hier würde die PDF-Generierung erfolgen
    alert("Offerte erstellt! (PDF-Generierung noch nicht implementiert)");
  };

  return (
    <div className="space-y-8">
      {/* Kosteneingabe */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Kosten eingeben</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Leistungspreis (CHF)"
            name="leistungspreis"
            type="number"
            min="0"
            step="0.01"
            value={offerte.kosten.leistungspreis || ""}
            onChange={(e) => updateKosten("leistungspreis", e.target.value)}
          />
          <Input
            label="Rabatt (%)"
            name="rabattProzent"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={offerte.kosten.rabattProzent || ""}
            onChange={(e) => updateKosten("rabattProzent", e.target.value)}
          />
        </div>
      </section>

      {/* Vorschau */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Vorschau</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="w-32 h-12 bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                HMQ Logo
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              {selectedStandort ? (
                <>
                  <p className="font-semibold">{selectedStandort.name}</p>
                  <p>{selectedStandort.strasse}</p>
                  <p>{selectedStandort.plzOrt}</p>
                  <p>{selectedStandort.telefon}</p>
                </>
              ) : (
                <p>Kein Standort gewählt</p>
              )}
            </div>
          </div>

          {/* Offerte Info */}
          <div className="mb-6 text-sm text-gray-600">
            <p>Offerte Nr.: {offerte.offertnummer || "–"}</p>
            <p>Datum: {formatDate(offerte.datum)}</p>
          </div>

          {/* Empfänger */}
          <div className="mb-8">
            <p className="font-semibold">
              {offerte.empfaenger.anrede} {offerte.empfaenger.name || "–"}
            </p>
            {offerte.empfaenger.zusatz && <p>{offerte.empfaenger.zusatz}</p>}
            <p>{offerte.empfaenger.strasse}</p>
            <p>{offerte.empfaenger.plzOrt}</p>
          </div>

          {/* Titel */}
          <h3 className="text-xl font-bold mb-4">
            Offerte: {offerte.projekt.bezeichnung || "–"}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Projekt-Ort: {offerte.projekt.ort || "–"} | Anfragedatum: {formatDate(offerte.projekt.anfrageDatum)}
          </p>

          {/* Checkbox Zusammenfassung */}
          <div className="mb-6 text-sm">
            <h4 className="font-semibold mb-2">Leistungsumfang:</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500">Art Bauvorhaben:</p>
                <p>
                  {[
                    offerte.checkboxen.artBauvorhaben.neubau && "Neubau",
                    offerte.checkboxen.artBauvorhaben.umbau && "Umbau",
                    offerte.checkboxen.artBauvorhaben.rueckbau && "Rückbau",
                    offerte.checkboxen.artBauvorhaben.sonstiges,
                  ].filter(Boolean).join(", ") || "–"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Art Gebäude:</p>
                <p>
                  {[
                    offerte.checkboxen.artGebaeude.efhFreistehend && "EFH",
                    offerte.checkboxen.artGebaeude.reihenhaus && "Reihenhaus",
                    offerte.checkboxen.artGebaeude.terrassenhaus && "Terrassenhaus",
                    offerte.checkboxen.artGebaeude.mfh && "MFH",
                    offerte.checkboxen.artGebaeude.strassen && "Strassen",
                    offerte.checkboxen.artGebaeude.kunstbauten && "Kunstbauten",
                    offerte.checkboxen.artGebaeude.sonstiges1,
                    offerte.checkboxen.artGebaeude.sonstiges2,
                  ].filter(Boolean).join(", ") || "–"}
                </p>
              </div>
            </div>
          </div>

          {/* Plan */}
          {offerte.planbeilage && (
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Planbeilage:</h4>
              <Image
                src={offerte.planbeilage.base64}
                alt="Plan"
                width={400}
                height={300}
                className="max-w-md border rounded"
              />
            </div>
          )}

          {/* Vorlaufzeit */}
          <div className="mb-6">
            <p className="text-sm">
              <span className="text-gray-500">Vorlaufzeit:</span> {offerte.vorlaufzeit}
            </p>
          </div>

          {/* Kostentabelle */}
          <div className="border-t pt-4 mt-6">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1">Leistungspreis</td>
                  <td className="py-1 text-right">{formatCurrency(offerte.kosten.leistungspreis)}</td>
                </tr>
                {offerte.kosten.rabattProzent > 0 && (
                  <tr>
                    <td className="py-1 text-red-600">Rabatt ({offerte.kosten.rabattProzent}%)</td>
                    <td className="py-1 text-right text-red-600">
                      -{formatCurrency(berechnungen.rabattBetrag)}
                    </td>
                  </tr>
                )}
                <tr className="border-t">
                  <td className="py-1">Netto</td>
                  <td className="py-1 text-right">{formatCurrency(berechnungen.netto)}</td>
                </tr>
                <tr>
                  <td className="py-1">MwSt (8.1%)</td>
                  <td className="py-1 text-right">{formatCurrency(berechnungen.mwst)}</td>
                </tr>
                <tr className="border-t-2 font-bold text-lg">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right">{formatCurrency(berechnungen.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Unterschriften */}
          <div className="mt-8 pt-4 border-t">
            <p className="text-sm text-gray-600 mb-4">Mit freundlichen Grüssen</p>
            <div className="flex gap-8">
              {selectedAnsprechpartner.map((ap) => (
                <div key={ap.id} className="text-center">
                  {ap.unterschriftDatei && (
                    <div className="h-16 mb-2">
                      <Image
                        src={`/${ap.unterschriftDatei}`}
                        alt={`Unterschrift ${ap.vorname} ${ap.nachname}`}
                        width={150}
                        height={60}
                        className="h-full w-auto object-contain"
                      />
                    </div>
                  )}
                  <p className="font-medium">{ap.vorname} {ap.nachname}</p>
                  <p className="text-sm text-gray-500">{ap.funktion}</p>
                </div>
              ))}
              {selectedAnsprechpartner.length === 0 && (
                <p className="text-gray-400">Keine Ansprechpartner gewählt</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="secondary" onClick={onBack}>
          Zurück
        </Button>
        <Button onClick={handleSubmit}>Offerte erstellen (PDF)</Button>
      </div>
    </div>
  );
}
