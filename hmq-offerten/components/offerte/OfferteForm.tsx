"use client";

import { useState, useEffect } from "react";
import Tabs, { TabPanel } from "@/components/ui/Tabs";
import Tab1Daten from "./Tab1Daten";
import Tab2Kosten from "./Tab2Kosten";
import { OfferteData, TabId, Leistung } from "@/lib/types";
import { getOfferteDraft, saveOfferteDraft } from "@/lib/store";
import Link from "next/link";

const defaultLeistungen: Leistung[] = [
  { id: "1", name: "Parkett schleifen", checked: false },
  { id: "2", name: "Parkett versiegeln", checked: false },
  { id: "3", name: "Parkett ölen", checked: false },
  { id: "4", name: "Parkett reparieren", checked: false },
  { id: "5", name: "Unterlagsboden", checked: false },
  { id: "6", name: "Sockelleisten", checked: false },
];

const defaultOfferte: OfferteData = {
  empfaenger: {
    firma: "",
    anrede: "",
    vorname: "",
    nachname: "",
    strasse: "",
    plz: "",
    ort: "",
  },
  projekt: {
    bezeichnung: "",
    standortId: "",
    ansprechpartnerId: "",
  },
  leistungen: defaultLeistungen,
  kosten: {
    arbeit: 0,
    material: 0,
    zusatz: 0,
    rabatt: 0,
  },
  planBild: undefined,
  bemerkungen: "",
};

const tabs = [
  { id: "daten", label: "1. Daten" },
  { id: "kosten", label: "2. Kosten & Vorschau" },
];

export default function OfferteForm() {
  const [activeTab, setActiveTab] = useState<TabId>("daten");
  const [offerte, setOfferte] = useState<OfferteData>(defaultOfferte);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const draft = getOfferteDraft();
    if (draft) {
      setOfferte({
        ...defaultOfferte,
        ...draft,
        leistungen: draft.leistungen || defaultLeistungen,
      });
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveOfferteDraft(offerte);
    }
  }, [offerte, isLoaded]);

  const updateOfferte = (updates: Partial<OfferteData>) => {
    setOfferte((prev) => ({ ...prev, ...updates }));
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="text-gray-500">Laden...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Offerte erstellen</h1>
        <Link
          href="/admin"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Admin
        </Link>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as TabId)}>
        <TabPanel id="daten" activeTab={activeTab}>
          <Tab1Daten
            offerte={offerte}
            updateOfferte={updateOfferte}
            onNext={() => setActiveTab("kosten")}
          />
        </TabPanel>

        <TabPanel id="kosten" activeTab={activeTab}>
          <Tab2Kosten
            offerte={offerte}
            updateOfferte={updateOfferte}
            onBack={() => setActiveTab("daten")}
          />
        </TabPanel>
      </Tabs>
    </div>
  );
}
