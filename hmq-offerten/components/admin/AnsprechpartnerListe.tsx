"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Ansprechpartner } from "@/lib/types";
import {
  getAnsprechpartner,
  addAnsprechpartner,
  updateAnsprechpartner,
  deleteAnsprechpartner,
} from "@/lib/store";

interface EditingAnsprechpartner extends Omit<Ansprechpartner, "id"> {
  id?: string;
}

const emptyAnsprechpartner: EditingAnsprechpartner = {
  vorname: "",
  nachname: "",
  funktion: "",
  unterschriftDatei: "",
};

export default function AnsprechpartnerListe() {
  const [ansprechpartner, setAnsprechpartner] = useState<Ansprechpartner[]>([]);
  const [editing, setEditing] = useState<EditingAnsprechpartner | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    setAnsprechpartner(getAnsprechpartner());
  }, []);

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

    if (!editing.vorname.trim() || !editing.nachname.trim()) {
      alert("Vor- und Nachname sind erforderlich");
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
              label="Vorname"
              value={editing.vorname}
              onChange={(e) => updateField("vorname", e.target.value)}
            />
            <Input
              label="Nachname"
              value={editing.nachname}
              onChange={(e) => updateField("nachname", e.target.value)}
            />
            <Input
              label="Funktion"
              value={editing.funktion}
              onChange={(e) => updateField("funktion", e.target.value)}
              placeholder="z.B. Projektleiter"
            />
            <Input
              label="Unterschrift-Datei"
              value={editing.unterschriftDatei}
              onChange={(e) => updateField("unterschriftDatei", e.target.value)}
              placeholder="unterschrift-xxx.png"
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {ansprechpartner.map((ap) => (
              <tr key={ap.id} className="hover:bg-gray-50">
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
