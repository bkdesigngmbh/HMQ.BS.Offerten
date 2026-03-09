'use client';

import { useState } from 'react';
import { KostenKategorie } from '@/lib/supabase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableKategorieRow({
  kategorie,
  onEdit,
  onDelete,
}: {
  kategorie: KostenKategorie;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: kategorie.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50 bg-white">
      <td className="px-2 py-3 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </td>
      <td className="px-4 py-3 font-medium text-gray-900">{kategorie.titel}</td>
      <td className="px-4 py-3 text-gray-500">{kategorie.beschreibung || '—'}</td>
      <td className="px-3 py-3 text-center font-mono">{kategorie.faktor_grundlagen}</td>
      <td className="px-3 py-3 text-center font-mono">{kategorie.faktor_termin}</td>
      <td className="px-3 py-3 text-center font-mono">{kategorie.faktor_aufnahme}</td>
      <td className="px-3 py-3 text-center font-mono">{kategorie.faktor_bericht}</td>
      <td className="px-3 py-3 text-center font-mono">{kategorie.faktor_kontrolle}</td>
      <td className="px-3 py-3 text-center font-mono">{kategorie.faktor_abschluss}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2 justify-end">
          <button onClick={onEdit} className="text-[#1e3a5f] hover:underline">Bearbeiten</button>
          <button onClick={onDelete} className="text-red-600 hover:underline">Löschen</button>
        </div>
      </td>
    </tr>
  );
}

interface KategorienTabProps {
  kategorien: KostenKategorie[];
  setKategorien: (kategorien: KostenKategorie[]) => void;
  saving: boolean;
  onSaveKat: (kat: Partial<KostenKategorie>) => Promise<void>;
  onDeleteKat: (id: string) => Promise<void>;
  onReorderSuccess: () => void;
  onReorderError: () => void;
  onReload: () => Promise<void>;
  inputClass: string;
}

export default function KategorienTab({
  kategorien,
  setKategorien,
  saving,
  onSaveKat,
  onDeleteKat,
  onReorderSuccess,
  onReorderError,
  onReload,
  inputClass,
}: KategorienTabProps) {
  const [editingKat, setEditingKat] = useState<KostenKategorie | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = kategorien.findIndex(k => k.id === active.id);
      const newIndex = kategorien.findIndex(k => k.id === over.id);

      const neueSortierung = arrayMove(kategorien, oldIndex, newIndex);
      const mitNeuenSortierungsWerten = neueSortierung.map((kat, index) => ({
        ...kat,
        sortierung: (index + 1) * 10,
      }));

      setKategorien(mitNeuenSortierungsWerten);

      try {
        const { updateKategorie } = await import('@/lib/supabase');
        await Promise.all(
          mitNeuenSortierungsWerten.map(kat =>
            updateKategorie(kat.id, { sortierung: kat.sortierung })
          )
        );
        onReorderSuccess();
      } catch {
        onReorderError();
        await onReload();
      }
    }
  }

  async function handleSave(kat: Partial<KostenKategorie>) {
    await onSaveKat(kat);
    setEditingKat(null);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Kostenkategorien</h2>
        <button
          onClick={() => setEditingKat({
            id: '', titel: '', beschreibung: '', sortierung: (kategorien.length + 1) * 10,
            faktor_grundlagen: 1, faktor_termin: 1, faktor_aufnahme: 1,
            faktor_bericht: 1, faktor_kontrolle: 1, faktor_abschluss: 1,
            created_at: '', updated_at: '',
          })}
          className="px-4 py-2 bg-[#1e3a5f] text-white text-sm font-medium rounded-xl hover:bg-[#162b47] transition-colors"
        >
          + Neue Kategorie
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10"></th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Titel</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Beschreibung</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Grundl.</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Termin</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Aufn.</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Bericht</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Kontr.</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Abschl.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <SortableContext items={kategorien.map(k => k.id)} strategy={verticalListSortingStrategy}>
                {kategorien
                  .sort((a, b) => a.sortierung - b.sortierung)
                  .map((k) => (
                    <SortableKategorieRow
                      key={k.id}
                      kategorie={k}
                      onEdit={() => setEditingKat(k)}
                      onDelete={() => onDeleteKat(k.id)}
                    />
                  ))}
              </SortableContext>
            </tbody>
          </table>
        </div>
      </DndContext>

      {/* Modal */}
      {editingKat && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">
                {editingKat.id ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
              </h3>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(editingKat); }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Titel</label>
                <input
                  type="text"
                  value={editingKat.titel}
                  onChange={(e) => setEditingKat({ ...editingKat, titel: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Beschreibung</label>
                <input
                  type="text"
                  value={editingKat.beschreibung || ''}
                  onChange={(e) => setEditingKat({ ...editingKat, beschreibung: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Faktoren</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['grundlagen', 'termin', 'aufnahme', 'bericht', 'kontrolle', 'abschluss'] as const).map((f) => {
                    const faktorKey = `faktor_${f}` as keyof KostenKategorie;
                    const faktorValue = editingKat[faktorKey] as number;
                    const displayValue = Number.isFinite(faktorValue) ? faktorValue : 1;
                    return (
                      <div key={f}>
                        <label className="block text-xs text-gray-500 mb-1 capitalize">{f}</label>
                        <input
                          type="number"
                          step="0.1"
                          value={displayValue}
                          onChange={(e) => {
                            const inputVal = e.target.value;
                            if (inputVal === '') {
                              setEditingKat({ ...editingKat, [`faktor_${f}`]: 1 });
                              return;
                            }
                            const val = parseFloat(inputVal);
                            setEditingKat({ ...editingKat, [`faktor_${f}`]: Number.isFinite(val) ? val : 1 });
                          }}
                          className={inputClass}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#1e3a5f] text-white font-medium rounded-xl hover:bg-[#162b47] disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Speichern...' : 'Speichern'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingKat(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
