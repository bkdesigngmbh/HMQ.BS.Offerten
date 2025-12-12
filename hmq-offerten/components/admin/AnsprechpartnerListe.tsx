"use client";

import { useState, useEffect } from "react";
import { Ansprechpartner } from "@/lib/types";
import { getAnsprechpartner } from "@/lib/store";

export default function AnsprechpartnerListe() {
  const [ansprechpartner, setAnsprechpartner] = useState<Ansprechpartner[]>([]);

  useEffect(() => {
    setAnsprechpartner(getAnsprechpartner());
  }, []);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Die Ansprechpartner werden in der Datei <code className="bg-gray-100 px-1 rounded">lib/data/ansprechpartner.json</code> verwaltet.
      </p>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Vorname
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nachname
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Funktion
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Unterschrift
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {ansprechpartner.map((ap) => (
              <tr key={ap.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-sm">
                  {ap.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">
                  {ap.vorname}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {ap.nachname}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {ap.funktion}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {ap.unterschriftDatei || "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
