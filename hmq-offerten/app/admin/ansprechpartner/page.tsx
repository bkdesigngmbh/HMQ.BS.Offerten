'use client';

import { useState, useEffect } from 'react';
import { Ansprechpartner } from '@/lib/types';
import { getAnsprechpartner, saveAnsprechpartner } from '@/lib/store';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function AnsprechpartnerPage() {
  const [ansprechpartner, setAnsprechpartner] = useState<Ansprechpartner[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { setAnsprechpartner(getAnsprechpartner()); }, []);

  const handleSave = (ap: Ansprechpartner) => {
    const updated = ansprechpartner.map(a => a.id === ap.id ? ap : a);
    setAnsprechpartner(updated);
    saveAnsprechpartner(updated);
    setEditingId(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-8 text-gray-800">Ansprechpartner verwalten</h1>
      <div className="space-y-4">
        {ansprechpartner.map((ap) => (
          <div key={ap.id} className="bg-white rounded-lg shadow-sm border p-4">
            {editingId === ap.id ? (
              <EditForm ap={ap} onSave={handleSave} onCancel={() => setEditingId(null)} />
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{ap.vorname} {ap.nachname}</p>
                  <p className="text-sm text-gray-600">{ap.funktion}</p>
                  <p className="text-xs text-gray-400 mt-1">Unterschrift: {ap.unterschriftDatei}</p>
                </div>
                <Button variant="secondary" onClick={() => setEditingId(ap.id)}>Bearbeiten</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditForm({ ap, onSave, onCancel }: { ap: Ansprechpartner; onSave: (a: Ansprechpartner) => void; onCancel: () => void }) {
  const [form, setForm] = useState(ap);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Vorname" value={form.vorname} onChange={(e) => setForm({ ...form, vorname: e.target.value })} />
        <Input label="Nachname" value={form.nachname} onChange={(e) => setForm({ ...form, nachname: e.target.value })} />
      </div>
      <Input label="Funktion" value={form.funktion} onChange={(e) => setForm({ ...form, funktion: e.target.value })} />
      <Input label="Unterschrift-Datei" value={form.unterschriftDatei} onChange={(e) => setForm({ ...form, unterschriftDatei: e.target.value })} placeholder="z.B. unterschrift-bpa.png" />
      <div className="flex gap-2 pt-2">
        <Button onClick={() => onSave(form)}>Speichern</Button>
        <Button variant="secondary" onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}
