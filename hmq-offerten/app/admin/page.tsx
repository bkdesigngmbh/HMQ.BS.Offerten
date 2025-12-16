'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  getKategorien, createKategorie, updateKategorie, deleteKategorie,
  getBasiswerte, updateBasiswerte,
  getEinstellungen, updateEinstellungen,
  getStandorte, updateStandort,
  KostenKategorie, KostenBasiswerte, AppEinstellungen, Standort,
} from '@/lib/supabase';
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

// Sortierbare Zeile Komponente
function SortableKategorieRow({
  kategorie,
  onEdit,
  onDelete
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
      {/* Drag Handle */}
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

type AdminTab = 'kategorien' | 'basiswerte' | 'standorte' | 'ansprechpartner' | 'einstellungen';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('kategorien');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [kategorien, setKategorien] = useState<KostenKategorie[]>([]);
  const [basiswerte, setBasiswerte] = useState<KostenBasiswerte | null>(null);
  const [einstellungen, setEinstellungen] = useState<AppEinstellungen | null>(null);
  const [standorte, setStandorte] = useState<Standort[]>([]);
  const [editingKat, setEditingKat] = useState<KostenKategorie | null>(null);

  // DnD Sensoren für Drag & Drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag & Drop Handler für Kategorien-Sortierung
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = kategorien.findIndex(k => k.id === active.id);
      const newIndex = kategorien.findIndex(k => k.id === over.id);

      // 1. Array neu sortieren
      const neueSortierung = arrayMove(kategorien, oldIndex, newIndex);

      // 2. Sortierung-Werte im lokalen State aktualisieren
      const mitNeuenSortierungsWerten = neueSortierung.map((kat, index) => ({
        ...kat,
        sortierung: (index + 1) * 10
      }));

      // 3. State SOFORT aktualisieren (optimistic update)
      setKategorien(mitNeuenSortierungsWerten);

      // 4. Dann in DB speichern (im Hintergrund)
      try {
        await Promise.all(
          mitNeuenSortierungsWerten.map(kat =>
            updateKategorie(kat.id, { sortierung: kat.sortierung })
          )
        );
        showMessage('success', 'Reihenfolge gespeichert');
      } catch (err) {
        showMessage('error', 'Fehler beim Speichern der Reihenfolge');
        await loadAll(); // Bei Fehler zurücksetzen
      }
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [k, b, e, s] = await Promise.all([
        getKategorien(),
        getBasiswerte(),
        getEinstellungen(),
        getStandorte(),
      ]);
      setKategorien(k);
      setBasiswerte(b);
      setEinstellungen(e);
      setStandorte(s);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleSaveKat(kat: Partial<KostenKategorie>) {
    setSaving(true);
    try {
      if (editingKat?.id) {
        await updateKategorie(editingKat.id, kat);
      } else {
        await createKategorie(kat as any);
      }
      showMessage('success', 'Gespeichert');
      setEditingKat(null);
      await loadAll();
    } catch (err) {
      showMessage('error', 'Fehler beim Speichern');
    }
    setSaving(false);
  }

  async function handleDeleteKat(id: string) {
    if (!confirm('Kategorie wirklich löschen?')) return;
    try {
      await deleteKategorie(id);
      showMessage('success', 'Gelöscht');
      await loadAll();
    } catch (err) {
      showMessage('error', 'Fehler beim Löschen');
    }
  }

  async function handleSaveBasis(e: React.FormEvent) {
    e.preventDefault();
    if (!basiswerte) return;
    setSaving(true);
    try {
      await updateBasiswerte(basiswerte);
      showMessage('success', 'Basiswerte gespeichert');
    } catch (err) {
      showMessage('error', 'Fehler beim Speichern');
    }
    setSaving(false);
  }

  async function handleSaveEinst(e: React.FormEvent) {
    e.preventDefault();
    if (!einstellungen) return;
    setSaving(true);
    try {
      await updateEinstellungen(einstellungen);
      showMessage('success', 'Einstellungen gespeichert');
    } catch (err) {
      showMessage('error', 'Fehler beim Speichern');
    }
    setSaving(false);
  }

  async function handleSaveStandort(id: string) {
    const standort = standorte.find(s => s.id === id);
    if (!standort) return;
    setSaving(true);
    try {
      await updateStandort(id, standort);
      showMessage('success', 'Standort gespeichert');
      await loadAll();
    } catch (err) {
      showMessage('error', 'Fehler beim Speichern');
    }
    setSaving(false);
  }

  function handleStandortChange(id: string, field: keyof Standort, value: string) {
    setStandorte(standorte.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'kategorien', label: 'Kostenkategorien' },
    { id: 'basiswerte', label: 'Basiswerte' },
    { id: 'standorte', label: 'Standorte' },
    { id: 'ansprechpartner', label: 'Ansprechpartner' },
    { id: 'einstellungen', label: 'Einstellungen' },
  ];

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all";

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#1e3a5f] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Titel */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin-Bereich</h1>
        <p className="text-gray-500 mt-1">Verwalten Sie Kategorien, Basiswerte und Einstellungen</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="inline-flex bg-gray-100 rounded-xl p-1 flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[#1e3a5f] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

        {/* KOSTENKATEGORIEN */}
        {activeTab === 'kategorien' && (
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

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-10"></th>{/* Drag Handle Spalte */}
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
                    <SortableContext
                      items={kategorien.map(k => k.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {kategorien
                        .sort((a, b) => a.sortierung - b.sortierung)
                        .map((k) => (
                          <SortableKategorieRow
                            key={k.id}
                            kategorie={k}
                            onEdit={() => setEditingKat(k)}
                            onDelete={() => handleDeleteKat(k.id)}
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
                  <form onSubmit={(e) => { e.preventDefault(); handleSaveKat(editingKat); }} className="p-6 space-y-4">
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
                        {['grundlagen', 'termin', 'aufnahme', 'bericht', 'kontrolle', 'abschluss'].map((f) => {
                          const faktorValue = (editingKat as any)[`faktor_${f}`];
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
                                  // Leeres Feld erlauben während Eingabe, aber als 1 speichern
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
        )}

        {/* BASISWERTE */}
        {activeTab === 'basiswerte' && basiswerte && (
          <form onSubmit={handleSaveBasis} className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Pauschalen (CHF pro Faktor 1)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: 'grundlagen_chf', label: 'Grundlagen' },
                  { key: 'termin_chf', label: 'Termin' },
                  { key: 'bericht_chf', label: 'Bericht' },
                  { key: 'kontrolle_chf', label: 'Kontrolle' },
                  { key: 'zustellbestaetigung_chf', label: 'Zustellbestätigung' },
                  { key: 'datenabgabe_chf', label: 'Datenabgabe' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-sm text-gray-600 mb-1.5">{f.label}</label>
                    <input
                      type="number"
                      step="0.05"
                      value={(basiswerte as any)[f.key] ?? 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setBasiswerte({ ...basiswerte, [f.key]: isNaN(val) ? 0 : val });
                      }}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Zustandsaufnahme</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Basisstunden pro Faktor</label>
                  <input
                    type="number"
                    step="0.1"
                    value={basiswerte.basisstunden_aufnahme ?? 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setBasiswerte({ ...basiswerte, basisstunden_aufnahme: isNaN(val) ? 0 : val });
                    }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Stundensatz (CHF)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={basiswerte.stundensatz_aufnahme ?? 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setBasiswerte({ ...basiswerte, stundensatz_aufnahme: isNaN(val) ? 0 : val });
                    }}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Material</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">USB Pauschal (CHF)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={basiswerte.usb_pauschal ?? 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setBasiswerte({ ...basiswerte, usb_pauschal: isNaN(val) ? 0 : val });
                    }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Binden pro Stück (CHF)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={basiswerte.binden_einheitspreis ?? 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setBasiswerte({ ...basiswerte, binden_einheitspreis: isNaN(val) ? 0 : val });
                    }}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Spesen-Sätze</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: 'km_satz', label: 'Kilometer (CHF)' },
                  { key: 'reisezeit_satz', label: 'Reisezeit/Std (CHF)' },
                  { key: 'verpflegung_satz', label: 'Verpflegung (CHF)' },
                  { key: 'uebernachtung_satz', label: 'Übernachtung (CHF)' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-sm text-gray-600 mb-1.5">{f.label}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={(basiswerte as any)[f.key] ?? 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setBasiswerte({ ...basiswerte, [f.key]: isNaN(val) ? 0 : val });
                      }}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-[#1e3a5f] text-white font-semibold rounded-xl hover:bg-[#162b47] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Speichern...' : 'Basiswerte speichern'}
            </button>
          </form>
        )}

        {/* STANDORTE */}
        {activeTab === 'standorte' && (
          <div>
            <h2 className="text-lg font-semibold mb-6">HMQ Standorte</h2>
            <div className="space-y-6">
              {standorte.map((s) => (
                <div key={s.id} className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-[#1e3a5f]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-[#1e3a5f] uppercase">{s.id}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{s.name}</h3>
                      <p className="text-sm text-gray-500">ID: {s.id}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Firma</label>
                      <input
                        type="text"
                        value={s.firma || 'HMQ AG'}
                        disabled
                        className={`${inputClass} opacity-60 cursor-not-allowed`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => handleStandortChange(s.id, 'name', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Strasse</label>
                      <input
                        type="text"
                        value={s.strasse}
                        onChange={(e) => handleStandortChange(s.id, 'strasse', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">PLZ</label>
                      <input
                        type="text"
                        value={s.plz}
                        onChange={(e) => handleStandortChange(s.id, 'plz', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ort</label>
                      <input
                        type="text"
                        value={s.ort}
                        onChange={(e) => handleStandortChange(s.id, 'ort', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="md:col-span-2 flex items-end">
                      <button
                        onClick={() => handleSaveStandort(s.id)}
                        disabled={saving}
                        className="px-6 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-xl hover:bg-[#162b47] disabled:opacity-50 transition-colors"
                      >
                        {saving ? 'Speichern...' : 'Speichern'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {standorte.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Keine Standorte gefunden.</p>
                  <p className="text-sm mt-1">Bitte erstellen Sie die Tabelle &quot;standorte&quot; in Supabase.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ANSPRECHPARTNER */}
        {activeTab === 'ansprechpartner' && (
          <div>
            <h2 className="text-lg font-semibold mb-6">Ansprechpartner</h2>
            <div className="space-y-4">
              {[
                { name: 'Benjamin Patt', funktion: 'Projektleiter', email: 'benjamin.patt@hmq.ch' },
                { name: 'Bianca Hochuli', funktion: 'Projektleiterin', email: 'bianca.hochuli@hmq.ch' },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
                    <span className="font-bold text-white text-lg">{p.name.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{p.name}</div>
                    <div className="text-sm text-gray-500">{p.funktion}</div>
                    <div className="text-sm text-[#1e3a5f]">{p.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EINSTELLUNGEN */}
        {activeTab === 'einstellungen' && einstellungen && (
          <form onSubmit={handleSaveEinst}>
            <h2 className="text-lg font-semibold mb-6">Standard-Einstellungen</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Standard-Standort</label>
                <select
                  value={einstellungen.standort_default}
                  onChange={(e) => setEinstellungen({ ...einstellungen, standort_default: e.target.value })}
                  className={inputClass}
                >
                  <option value="zh">Zürich-Opfikon</option>
                  <option value="gr">Chur</option>
                  <option value="ag">Zofingen</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Standard-Vorlaufzeit</label>
                <input
                  type="text"
                  value={einstellungen.vorlaufzeit_default}
                  onChange={(e) => setEinstellungen({ ...einstellungen, vorlaufzeit_default: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Standard-Einsatzpauschalen</label>
                <select
                  value={einstellungen.einsatzpauschalen_default}
                  onChange={(e) => setEinstellungen({ ...einstellungen, einsatzpauschalen_default: parseInt(e.target.value) })}
                  className={inputClass}
                >
                  {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-[#1e3a5f] text-white font-semibold rounded-xl hover:bg-[#162b47] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Speichern...' : 'Einstellungen speichern'}
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
