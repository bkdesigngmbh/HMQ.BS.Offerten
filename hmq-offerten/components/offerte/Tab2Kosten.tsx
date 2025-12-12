"use client";

import { useMemo, useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { OfferteData, Ansprechpartner, Standort } from "@/lib/types";
import { getAnsprechpartner, getStandorte, clearOfferteDraft } from "@/lib/store";
import Image from "next/image";

interface Tab2KostenProps {
  offerte: OfferteData;
  updateOfferte: (updates: Partial<OfferteData>) => void;
  onBack: () => void;
}

const MWST_SATZ = 0.081; // 8.1% MwSt

export default function Tab2Kosten({ offerte, updateOfferte, onBack }: Tab2KostenProps) {
  const [ansprechpartner, setAnsprechpartner] = useState<Ansprechpartner[]>([]);
  const [standorte, setStandorte] = useState<Standort[]>([]);

  useEffect(() => {
    setAnsprechpartner(getAnsprechpartner());
    setStandorte(getStandorte());
  }, []);

  const updateKosten = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateOfferte({
      kosten: { ...offerte.kosten, [field]: numValue },
    });
  };

  const berechnungen = useMemo(() => {
    const { arbeit, material, zusatz, rabatt } = offerte.kosten;
    const zwischensumme = arbeit + material + zusatz;
    const rabattBetrag = (zwischensumme * rabatt) / 100;
    const netto = zwischensumme - rabattBetrag;
    const mwst = netto * MWST_SATZ;
    const total = netto + mwst;

    return {
      zwischensumme,
      rabattBetrag,
      netto,
      mwst,
      total,
    };
  }, [offerte.kosten]);

  const selectedAnsprechpartner = ansprechpartner.find(
    (a) => a.id === offerte.projekt.ansprechpartnerId
  );

  const selectedStandort = standorte.find(
    (s) => s.id === offerte.projekt.standortId
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
    }).format(value);
  };

  const handleSubmit = () => {
    // Hier würde die PDF-Generierung erfolgen
    alert("Offerte erstellt! (PDF-Generierung noch nicht implementiert)");
    clearOfferteDraft();
  };

  const selectedLeistungen = offerte.leistungen.filter((l) => l.checked);

  return (
    <div className="space-y-8">
      {/* Kosteneingabe */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Kosten eingeben</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Arbeitskosten (CHF)"
            name="arbeit"
            type="number"
            min="0"
            step="0.01"
            value={offerte.kosten.arbeit || ""}
            onChange={(e) => updateKosten("arbeit", e.target.value)}
          />
          <Input
            label="Materialkosten (CHF)"
            name="material"
            type="number"
            min="0"
            step="0.01"
            value={offerte.kosten.material || ""}
            onChange={(e) => updateKosten("material", e.target.value)}
          />
          <Input
            label="Zusatzkosten (CHF)"
            name="zusatz"
            type="number"
            min="0"
            step="0.01"
            value={offerte.kosten.zusatz || ""}
            onChange={(e) => updateKosten("zusatz", e.target.value)}
          />
          <Input
            label="Rabatt (%)"
            name="rabatt"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={offerte.kosten.rabatt || ""}
            onChange={(e) => updateKosten("rabatt", e.target.value)}
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
                  <p>{selectedStandort.adresse}</p>
                  <p>
                    {selectedStandort.plz} {selectedStandort.ort}
                  </p>
                </>
              ) : (
                <p>Kein Standort gewählt</p>
              )}
            </div>
          </div>

          {/* Empfänger */}
          <div className="mb-8">
            <p className="font-semibold">{offerte.empfaenger.firma || "–"}</p>
            <p>
              {offerte.empfaenger.anrede === "herr"
                ? "Herr"
                : offerte.empfaenger.anrede === "frau"
                ? "Frau"
                : ""}{" "}
              {offerte.empfaenger.vorname} {offerte.empfaenger.nachname}
            </p>
            <p>{offerte.empfaenger.strasse}</p>
            <p>
              {offerte.empfaenger.plz} {offerte.empfaenger.ort}
            </p>
          </div>

          {/* Titel */}
          <h3 className="text-xl font-bold mb-4">
            Offerte: {offerte.projekt.bezeichnung || "–"}
          </h3>

          {/* Leistungen */}
          {selectedLeistungen.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Leistungen:</h4>
              <ul className="list-disc list-inside text-gray-700">
                {selectedLeistungen.map((l) => (
                  <li key={l.id}>{l.name}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Plan */}
          {offerte.planBild && (
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Plan:</h4>
              <Image
                src={offerte.planBild}
                alt="Plan"
                width={400}
                height={300}
                className="max-w-md border rounded"
              />
            </div>
          )}

          {/* Bemerkungen */}
          {offerte.bemerkungen && (
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Bemerkungen:</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{offerte.bemerkungen}</p>
            </div>
          )}

          {/* Kostentabelle */}
          <div className="border-t pt-4 mt-6">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1">Arbeitskosten</td>
                  <td className="py-1 text-right">{formatCurrency(offerte.kosten.arbeit)}</td>
                </tr>
                <tr>
                  <td className="py-1">Materialkosten</td>
                  <td className="py-1 text-right">{formatCurrency(offerte.kosten.material)}</td>
                </tr>
                <tr>
                  <td className="py-1">Zusatzkosten</td>
                  <td className="py-1 text-right">{formatCurrency(offerte.kosten.zusatz)}</td>
                </tr>
                <tr className="border-t">
                  <td className="py-1 font-medium">Zwischensumme</td>
                  <td className="py-1 text-right font-medium">
                    {formatCurrency(berechnungen.zwischensumme)}
                  </td>
                </tr>
                {offerte.kosten.rabatt > 0 && (
                  <tr>
                    <td className="py-1 text-red-600">Rabatt ({offerte.kosten.rabatt}%)</td>
                    <td className="py-1 text-right text-red-600">
                      -{formatCurrency(berechnungen.rabattBetrag)}
                    </td>
                  </tr>
                )}
                <tr>
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

          {/* Unterschrift */}
          <div className="mt-8 pt-4 border-t">
            <p className="text-sm text-gray-600 mb-2">Mit freundlichen Grüssen</p>
            {selectedAnsprechpartner?.unterschriftBild && (
              <div className="h-16 mb-2">
                <Image
                  src={selectedAnsprechpartner.unterschriftBild}
                  alt="Unterschrift"
                  width={150}
                  height={60}
                  className="h-full w-auto object-contain"
                />
              </div>
            )}
            <p className="font-medium">
              {selectedAnsprechpartner?.name || "Ansprechpartner wählen"}
            </p>
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
