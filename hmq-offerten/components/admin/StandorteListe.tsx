"use client";

import { useState, useEffect } from "react";
import { Standort } from "@/lib/types";
import { getStandorte } from "@/lib/store";

export default function StandorteListe() {
  const [standorte, setStandorte] = useState<Standort[]>([]);

  useEffect(() => {
    setStandorte(getStandorte());
  }, []);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Die Standorte werden in der Datei <code className="bg-gray-100 px-1 rounded">lib/data/standorte.json</code> verwaltet.
      </p>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Strasse
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                PLZ / Ort
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Telefon
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {standorte.map((standort) => (
              <tr key={standort.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-sm">
                  {standort.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">
                  {standort.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {standort.strasse}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {standort.plzOrt}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {standort.telefon}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
