"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Ansprechpartner, Standort } from "@/lib/types";
import {
  getAnsprechpartner,
  addAnsprechpartner,
  updateAnsprechpartner,
  deleteAnsprechpartner,
  getStandorte,
} from "@/lib/store";

interface EditingAnsprechpartner extends Omit<Ansprechpartner, "id"> {
  id?: string;
}

const emptyAnsprechpartner: EditingAnsprechpartner = {
  name: "",
  email: "",
  telefon: "",
  standortId: "",
  unterschriftBild: "",
};

export default function AnsprechpartnerListe() {
  const [ansprechpartner, setAnsprechpartner] = useState<Ansprechpartner[]>([]);
  const [standorte, setStandorte] = useState<Standort[]>([]);
  const [editing, setEditing] = useState<EditingAnsprechpartner | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    setAnsprechpartner(getAnsprechpartner());
    setStandorte(getStandorte());
  }, []);

  const getStandortName = (standortId: string) => {
    const standort = standorte.find((s) => s.id === standortId);
    return standort?.name || "–";
  };

  const handleNew = () => {
    setEditing({ ...emptyAnsprechpartner });
    setIsNew(true);
  };

  const handleEdit = (ap: Ansprechpartner) => {
    setEditing({ ...ap });
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
      addAnsprechpartner(editing);
    } else if (editing.id) {
      updateAnsprechpartner(editing.id, editing);
    }

    setAnsprechpartner(getAnsprechpartner());
    setEditing(null);
    setIsNew(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Ansprechpartner wirklich löschen?")) return;
    deleteAnsprechpartner(id);
    setAnsprechpartner(getAnsprechpartner());
  };

  const updateField = (field: keyof EditingAnsprechpartner, value: string) => {
    if (!editing) return;
    setEditing({ ...editing, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleNew} disabled={!!editing}>
          Neuer Ansprechpartner
        </Button>
      </div>

      {/* Bearbeitungsformular */}
      {editing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium mb-4">
            {isNew ? "Neuer Ansprechpartner" : "Ansprechpartner bearbeiten"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              value={editing.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
            <Input
              label="E-Mail"
              type="email"
              value={editing.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
            <Input
              label="Telefon"
              value={editing.telefon}
              onChange={(e) => updateField("telefon", e.target.value)}
            />
            <Select
              label="Standort"
              value={editing.standortId}
              onChange={(e) => updateField("standortId", e.target.value)}
              options={standorte.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Standort wählen"
            />
            <Input
              label="Unterschrift-Bild (Pfad)"
              value={editing.unterschriftBild || ""}
              onChange={(e) => updateField("unterschriftBild", e.target.value)}
              placeholder="/unterschrift-xxx.png"
              className="md:col-span-2"
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
                E-Mail
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Telefon
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Standort
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {ansprechpartner.map((ap) => (
              <tr key={ap.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">
                  {ap.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {ap.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {ap.telefon}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {getStandortName(ap.standortId)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(ap)}
                    disabled={!!editing}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(ap.id)}
                    disabled={!!editing}
                    className="ml-2"
                  >
                    Löschen
                  </Button>
                </td>
              </tr>
            ))}
            {ansprechpartner.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Keine Ansprechpartner vorhanden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
