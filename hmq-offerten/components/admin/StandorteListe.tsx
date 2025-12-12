"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Standort } from "@/lib/types";
import {
  getStandorte,
  addStandort,
  updateStandort,
  deleteStandort,
} from "@/lib/store";

interface EditingStandort extends Omit<Standort, "id"> {
  id?: string;
}

const emptyStandort: EditingStandort = {
  name: "",
  adresse: "",
  plz: "",
  ort: "",
};

export default function StandorteListe() {
  const [standorte, setStandorte] = useState<Standort[]>([]);
  const [editing, setEditing] = useState<EditingStandort | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    setStandorte(getStandorte());
  }, []);

  const handleNew = () => {
    setEditing({ ...emptyStandort });
    setIsNew(true);
  };

  const handleEdit = (standort: Standort) => {
    setEditing({ ...standort });
    setIsNew(false);
  };

  const handleCancel = () => {
    setEditing(null);
    setIsNew(false);
  };

  const handleSave = () => {
    if (!editing) return;

    if (!editing.name.trim()) {
      alert("Name ist erforderlich");
      return;
    }

    if (isNew) {
      addStandort(editing);
    } else if (editing.id) {
      updateStandort(editing.id, editing);
    }

    setStandorte(getStandorte());
    setEditing(null);
    setIsNew(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Standort wirklich löschen?")) return;
    deleteStandort(id);
    setStandorte(getStandorte());
  };

  const updateField = (field: keyof EditingStandort, value: string) => {
    if (!editing) return;
    setEditing({ ...editing, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleNew} disabled={!!editing}>
          Neuer Standort
        </Button>
      </div>

      {/* Bearbeitungsformular */}
      {editing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium mb-4">
            {isNew ? "Neuer Standort" : "Standort bearbeiten"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              value={editing.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
            <Input
              label="Adresse"
              value={editing.adresse}
              onChange={(e) => updateField("adresse", e.target.value)}
            />
            <Input
              label="PLZ"
              value={editing.plz}
              onChange={(e) => updateField("plz", e.target.value)}
            />
            <Input
              label="Ort"
              value={editing.ort}
              onChange={(e) => updateField("ort", e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave}>Speichern</Button>
            <Button variant="secondary" onClick={handleCancel}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Adresse
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                PLZ / Ort
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {standorte.map((standort) => (
              <tr key={standort.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">
                  {standort.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {standort.adresse}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {standort.plz} {standort.ort}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(standort)}
                    disabled={!!editing}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(standort.id)}
                    disabled={!!editing}
                    className="ml-2"
                  >
                    Löschen
                  </Button>
                </td>
              </tr>
            ))}
            {standorte.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Keine Standorte vorhanden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
