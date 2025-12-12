'use client';

import { useState, useEffect } from 'react';
import { Standort } from '@/lib/types';
import { getStandorte, saveStandorte } from '@/lib/store';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function StandortePage() {
  const [standorte, setStandorte] = useState<Standort[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { setStandorte(getStandorte()); }, []);

  const handleSave = (standort: Standort) => {
    const updated = standorte.map(s => s.id === standort.id ? standort : s);
    setStandorte(updated);
    saveStandorte(updated);
    setEditingId(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-8 text-gray-800">Standorte verwalten</h1>
      <div className="space-y-4">
        {standorte.map((standort) => (
          <div key={standort.id} className="bg-white rounded-lg shadow-sm border p-4">
            {editingId === standort.id ? (
              <EditForm standort={standort} onSave={handleSave} onCancel={() => setEditingId(null)} />
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{standort.name}</p>
                  <p className="text-sm text-gray-600">{standort.strasse}</p>
                  <p className="text-sm text-gray-600">{standort.plzOrt}</p>
                  <p className="text-sm text-gray-500">{standort.telefon}</p>
                </div>
                <Button variant="secondary" onClick={() => setEditingId(standort.id)}>Bearbeiten</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditForm({ standort, onSave, onCancel }: { standort: Standort; onSave: (s: Standort) => void; onCancel: () => void }) {
  const [form, setForm] = useState(standort);
  return (
    <div className="space-y-3">
      <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input label="Strasse" value={form.strasse} onChange={(e) => setForm({ ...form, strasse: e.target.value })} />
      <Input label="PLZ / Ort" value={form.plzOrt} onChange={(e) => setForm({ ...form, plzOrt: e.target.value })} />
      <Input label="Telefon" value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} />
      <div className="flex gap-2 pt-2">
        <Button onClick={() => onSave(form)}>Speichern</Button>
        <Button variant="secondary" onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}
