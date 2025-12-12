"use client";

import { useState } from "react";
import Tabs, { TabPanel } from "@/components/ui/Tabs";
import Tab1Daten from "./Tab1Daten";
import Tab2Kosten from "./Tab2Kosten";
import { Offerte, TabId, createEmptyOfferte } from "@/lib/types";
import Link from "next/link";

const tabs = [
  { id: "daten", label: "1. Daten" },
  { id: "kosten", label: "2. Kosten & Vorschau" },
];

export default function OfferteForm() {
  const [activeTab, setActiveTab] = useState<TabId>("daten");
  const [offerte, setOfferte] = useState<Offerte>(createEmptyOfferte());

  const updateOfferte = (updates: Partial<Offerte>) => {
    setOfferte((prev) => ({ ...prev, ...updates }));
  };

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
