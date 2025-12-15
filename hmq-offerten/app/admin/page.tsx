'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import {
  KostenKategorie,
  KostenBasiswerte,
  AppEinstellungen,
  getKategorien,
  createKategorie,
  updateKategorie,
  deleteKategorie,
  getBasiswerte,
  updateBasiswerte,
  getEinstellungen,
  updateEinstellungen,
} from '@/lib/supabase';

type TabId = 'kategorien' | 'basiswerte' | 'einstellungen';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('kategorien');

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="mt-1 text-gray-500">Verwalten Sie Kategorien, Basiswerte und App-Einstellungen.</p>
      </div>

      {/* Quick Links */}
      <div className="mb-6 flex gap-3">
        <Link
          href="/admin/standorte"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Standorte
        </Link>
        <Link
          href="/admin/ansprechpartner"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Ansprechpartner
        </Link>
      </div>

      {/* Tabs für Supabase-Daten */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Tab-Header */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('kategorien')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'kategorien'
                ? 'text-[#1e3a5f] border-b-2 border-[#1e3a5f]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Kosten-Kategorien
          </button>
          <button
            onClick={() => setActiveTab('basiswerte')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'basiswerte'
                ? 'text-[#1e3a5f] border-b-2 border-[#1e3a5f]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Basiswerte
          </button>
          <button
            onClick={() => setActiveTab('einstellungen')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'einstellungen'
                ? 'text-[#1e3a5f] border-b-2 border-[#1e3a5f]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Einstellungen
          </button>
        </div>

        {/* Tab-Content */}
        <div className="p-6">
          {activeTab === 'kategorien' && <KategorienTab />}
          {activeTab === 'basiswerte' && <BasiswerteTab />}
          {activeTab === 'einstellungen' && <EinstellungenTab />}
        </div>
      </div>
    </AppLayout>
  );
}

// =====================================================
// KATEGORIEN TAB
// =====================================================

function KategorienTab() {
  const [kategorien, setKategorien] = useState<KostenKategorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<KostenKategorie>>({});

  const loadKategorien = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getKategorien();
      setKategorien(data);
      setError(null);
    } catch (err) {
      setError('Fehler beim Laden der Kategorien');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKategorien();
  }, [loadKategorien]);

  const handleCreate = async () => {
    try {
      const newKategorie = await createKategorie({
        titel: 'Neue Kategorie',
        beschreibung: '',
        sortierung: kategorien.length + 1,
        faktor_grundlagen: 1,
        faktor_termin: 1,
        faktor_aufnahme: 1,
        faktor_bericht: 1,
        faktor_kontrolle: 1,
        faktor_abschluss: 1,
      });
      setKategorien([...kategorien, newKategorie]);
      setEditingId(newKategorie.id);
      setFormData(newKategorie);
    } catch (err) {
      setError('Fehler beim Erstellen');
      console.error(err);
    }
  };

  const handleEdit = (kategorie: KostenKategorie) => {
    setEditingId(kategorie.id);
    setFormData({ ...kategorie });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      const updated = await updateKategorie(editingId, formData);
      setKategorien(kategorien.map((k) => (k.id === editingId ? updated : k)));
      setEditingId(null);
      setFormData({});
    } catch (err) {
      setError('Fehler beim Speichern');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Kategorie wirklich löschen?')) return;
    try {
      await deleteKategorie(id);
      setKategorien(kategorien.filter((k) => k.id !== id));
    } catch (err) {
      setError('Fehler beim Löschen');
      console.error(err);
    }
  };

  if (loading) return <div className="text-gray-500">Lade Kategorien...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Kosten-Kategorien</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          + Neue Kategorie
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-2">Sort.</th>
              <th className="text-left p-2">Titel</th>
              <th className="text-left p-2">Beschreibung</th>
              <th className="text-center p-2">Grundlagen</th>
              <th className="text-center p-2">Termin</th>
              <th className="text-center p-2">Aufnahme</th>
              <th className="text-center p-2">Bericht</th>
              <th className="text-center p-2">Kontrolle</th>
              <th className="text-center p-2">Abschluss</th>
              <th className="text-right p-2">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {kategorien.map((k) =>
              editingId === k.id ? (
                <tr key={k.id} className="border-b bg-blue-50">
                  <td className="p-2">
                    <input
                      type="number"
                      value={formData.sortierung || 0}
                      onChange={(e) => setFormData({ ...formData, sortierung: parseInt(e.target.value) })}
                      className="w-16 px-2 py-1 border rounded"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={formData.titel || ''}
                      onChange={(e) => setFormData({ ...formData, titel: e.target.value })}
                      className="w-full px-2 py-1 border rounded"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={formData.beschreibung || ''}
                      onChange={(e) => setFormData({ ...formData, beschreibung: e.target.value })}
                      className="w-full px-2 py-1 border rounded"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.faktor_grundlagen || 1}
                      onChange={(e) => setFormData({ ...formData, faktor_grundlagen: parseFloat(e.target.value) })}
                      className="w-16 px-2 py-1 border rounded text-center"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.faktor_termin || 1}
                      onChange={(e) => setFormData({ ...formData, faktor_termin: parseFloat(e.target.value) })}
                      className="w-16 px-2 py-1 border rounded text-center"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.faktor_aufnahme || 1}
                      onChange={(e) => setFormData({ ...formData, faktor_aufnahme: parseFloat(e.target.value) })}
                      className="w-16 px-2 py-1 border rounded text-center"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.faktor_bericht || 1}
                      onChange={(e) => setFormData({ ...formData, faktor_bericht: parseFloat(e.target.value) })}
                      className="w-16 px-2 py-1 border rounded text-center"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.faktor_kontrolle || 1}
                      onChange={(e) => setFormData({ ...formData, faktor_kontrolle: parseFloat(e.target.value) })}
                      className="w-16 px-2 py-1 border rounded text-center"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.faktor_abschluss || 1}
                      onChange={(e) => setFormData({ ...formData, faktor_abschluss: parseFloat(e.target.value) })}
                      className="w-16 px-2 py-1 border rounded text-center"
                    />
                  </td>
                  <td className="p-2 text-right space-x-2">
                    <button onClick={handleSave} className="text-green-600 hover:text-green-800">
                      Speichern
                    </button>
                    <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
                      Abbrechen
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={k.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{k.sortierung}</td>
                  <td className="p-2 font-medium">{k.titel}</td>
                  <td className="p-2 text-gray-500">{k.beschreibung || '-'}</td>
                  <td className="p-2 text-center">{k.faktor_grundlagen}</td>
                  <td className="p-2 text-center">{k.faktor_termin}</td>
                  <td className="p-2 text-center">{k.faktor_aufnahme}</td>
                  <td className="p-2 text-center">{k.faktor_bericht}</td>
                  <td className="p-2 text-center">{k.faktor_kontrolle}</td>
                  <td className="p-2 text-center">{k.faktor_abschluss}</td>
                  <td className="p-2 text-right space-x-2">
                    <button onClick={() => handleEdit(k)} className="text-blue-600 hover:text-blue-800">
                      Bearbeiten
                    </button>
                    <button onClick={() => handleDelete(k.id)} className="text-red-600 hover:text-red-800">
                      Löschen
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =====================================================
// BASISWERTE TAB
// =====================================================

function BasiswerteTab() {
  const [basiswerte, setBasiswerte] = useState<KostenBasiswerte | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadBasiswerte = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBasiswerte();
      setBasiswerte(data);
      setError(null);
    } catch (err) {
      setError('Fehler beim Laden der Basiswerte');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBasiswerte();
  }, [loadBasiswerte]);

  const handleChange = (field: keyof KostenBasiswerte, value: number) => {
    if (basiswerte) {
      setBasiswerte({ ...basiswerte, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!basiswerte) return;
    try {
      setSaving(true);
      const updated = await updateBasiswerte(basiswerte);
      setBasiswerte(updated);
      setError(null);
    } catch (err) {
      setError('Fehler beim Speichern');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500">Lade Basiswerte...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!basiswerte) return <div className="text-gray-500">Keine Daten</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Basiswerte für Kostenberechnung</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
        >
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Leistungspositionen */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700 border-b pb-2">Leistungspositionen (CHF)</h3>
          <div className="grid gap-3">
            <label className="flex justify-between items-center">
              <span className="text-sm">Grundlagen</span>
              <input
                type="number"
                value={basiswerte.grundlagen_chf}
                onChange={(e) => handleChange('grundlagen_chf', parseFloat(e.target.value))}
                className="w-32 px-3 py-1 border rounded text-right"
              />
            </label>
            <label className="flex justify-between items-center">
              <span className="text-sm">Termin</span>
              <input
                type="number"
                value={basiswerte.termin_chf}
                onChange={(e) => handleChange('termin_chf', parseFloat(e.target.value))}
                className="w-32 px-3 py-1 border rounded text-right"
              />
            </label>
            <label className="flex justify-between items-center">
              <span className="text-sm">Bericht</span>
              <input
                type="number"
                value={basiswerte.bericht_chf}
                onChange={(e) => handleChange('bericht_chf', parseFloat(e.target.value))}
                className="w-32 px-3 py-1 border rounded text-right"
              />
            </label>
            <label className="flex justify-between items-center">
              <span className="text-sm">Kontrolle</span>
              <input
                type="number"
                value={basiswerte.kontrolle_chf}
                onChange={(e) => handleChange('kontrolle_chf', parseFloat(e.target.value))}
                className="w-32 px-3 py-1 border rounded text-right"
              />
            </label>
            <label className="flex justify-between items-center">
              <span className="text-sm">Zustellbestätigung</span>
              <input
                type="number"
                value={basiswerte.zustellbestaetigung_chf}
                onChange={(e) => handleChange('zustellbestaetigung_chf', parseFloat(e.target.value))}
                className="w-32 px-3 py-1 border rounded text-right"
              />
            </label>
            <label className="flex justify-between items-center">
              <span className="text-sm">Datenabgabe</span>
              <input
                type="number"
                value={basiswerte.datenabgabe_chf}
                onChange={(e) => handleChange('datenabgabe_chf', parseFloat(e.target.value))}
                className="w-32 px-3 py-1 border rounded text-right"
              />
            </label>
          </div>
        </div>

        {/* Aufnahme */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700 border-b pb-2">Aufnahme</h3>
          <div className="grid gap-3">
            <label className="flex justify-between items-center">
              <span className="text-sm">Basisstunden</span>
              <input
                type="number"
                value={basiswerte.basisstunden_aufnahme}
                onChange={(e) => handleChange('basisstunden_aufnahme', parseFloat(e.target.value))}
                className="w-32 px-3 py-1 border rounded text-right"
              />
            </label>
            <label className="flex justify-between items-center">
              <span className="text-sm">Stundensatz (CHF)</span>
              <input
                type="number"
                value={basiswerte.stundensatz_aufnahme}
                onChange={(e) => handleChange('stundensatz_aufnahme', parseFloat(e.target.value))}
                className="w-32 px-3 py-1 border rounded text-right"
              />
            </label>
          </div>
        </div>

        {/* Nebenkosten */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700 border-b pb-2">Nebenkosten</h3>
          <div className="grid gap-3">
            <label className="flex justify-between items-center">
              <span className="text-sm">USB Pauschal (CHF)</span>
              <input
                type="number"
                value={basiswerte.usb_pauschal}
                onChange={(e) => handleChange('usb_pauschal', parseFloat(e.target.value))}
                className="w-32 px-3 py-1 border rounded text-right"
              />
            </label>
            <label className="flex justify-between items-center">
              <span className="text-sm">Binden Einheitspreis (CHF)</span>
              <input
                type="number"
                value={basiswerte.binden_einheitspreis}
                onChange={(e) => handleChange('binden_einheitspreis', parseFloat(e.target.value))}
                className="w-32 px-3 py-1 border rounded text-right"
              />
            </label>
          </div>
        </div>

        {/* Spesen */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700 border-b pb-2">Spesen</h3>
          <div className="grid gap-3">
            <label className="flex justify-between items-center">
              <span className="text-sm">km-Satz (CHF)</span>
              <input
                type="number"
                step="0.01"
                value={basiswerte.km_satz}
                onChange={(e) => handleChange('km_satz', parseFloat(e.target.value))}
                className="w-32 px-3 py-1 border rounded text-right"
              />
            </label>
            <label className="flex justify-between items-center">
              <span className="text-sm">Reisezeit-Satz (CHF)</span>
              <input
                type="number"
                value={basiswerte.reisezeit_satz}
                onChange={(e) => handleChange('reisezeit_satz', parseFloat(e.target.value))}
                className="w-32 px-3 py-1 border rounded text-right"
              />
            </label>
            <label className="flex justify-between items-center">
              <span className="text-sm">Verpflegung (CHF)</span>
              <input
                type="number"
                value={basiswerte.verpflegung_satz}
                onChange={(e) => handleChange('verpflegung_satz', parseFloat(e.target.value))}
                className="w-32 px-3 py-1 border rounded text-right"
              />
            </label>
            <label className="flex justify-between items-center">
              <span className="text-sm">Übernachtung (CHF)</span>
              <input
                type="number"
                value={basiswerte.uebernachtung_satz}
                onChange={(e) => handleChange('uebernachtung_satz', parseFloat(e.target.value))}
                className="w-32 px-3 py-1 border rounded text-right"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Zuletzt geändert: {new Date(basiswerte.updated_at).toLocaleString('de-CH')}
      </div>
    </div>
  );
}

// =====================================================
// EINSTELLUNGEN TAB
// =====================================================

function EinstellungenTab() {
  const [einstellungen, setEinstellungen] = useState<AppEinstellungen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadEinstellungen = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEinstellungen();
      setEinstellungen(data);
      setError(null);
    } catch (err) {
      setError('Fehler beim Laden der Einstellungen');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEinstellungen();
  }, [loadEinstellungen]);

  const handleSave = async () => {
    if (!einstellungen) return;
    try {
      setSaving(true);
      const updated = await updateEinstellungen(einstellungen);
      setEinstellungen(updated);
      setError(null);
    } catch (err) {
      setError('Fehler beim Speichern');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500">Lade Einstellungen...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!einstellungen) return <div className="text-gray-500">Keine Daten</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">App-Einstellungen</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
        >
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Defaults */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700 border-b pb-2">Standard-Werte für neue Offerten</h3>
          <div className="grid grid-cols-3 gap-4">
            <label className="block">
              <span className="text-sm text-gray-600">Standort</span>
              <select
                value={einstellungen.standort_default}
                onChange={(e) => setEinstellungen({ ...einstellungen, standort_default: e.target.value })}
                className="mt-1 w-full px-3 py-2 border rounded"
              >
                <option value="zh">Zürich</option>
                <option value="lu">Luzern</option>
                <option value="be">Bern</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Vorlaufzeit</span>
              <select
                value={einstellungen.vorlaufzeit_default}
                onChange={(e) => setEinstellungen({ ...einstellungen, vorlaufzeit_default: e.target.value })}
                className="mt-1 w-full px-3 py-2 border rounded"
              >
                <option value="1 Woche">1 Woche</option>
                <option value="2 Wochen">2 Wochen</option>
                <option value="3 Wochen">3 Wochen</option>
                <option value="4 Wochen">4 Wochen</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Einsatzpauschalen</span>
              <input
                type="number"
                value={einstellungen.einsatzpauschalen_default}
                onChange={(e) =>
                  setEinstellungen({ ...einstellungen, einsatzpauschalen_default: parseInt(e.target.value) })
                }
                className="mt-1 w-full px-3 py-2 border rounded"
              />
            </label>
          </div>
        </div>

        {/* Standard-Checkboxen Info */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700 border-b pb-2">Standard-Checkboxen</h3>
          <p className="text-sm text-gray-500">
            Die Standard-Checkbox-Werte werden in <code className="bg-gray-100 px-1 rounded">lib/types.ts</code> in der
            Funktion <code className="bg-gray-100 px-1 rounded">createEmptyOfferte()</code> definiert.
          </p>
          {einstellungen.standard_checkboxen && (
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-64">
              {JSON.stringify(einstellungen.standard_checkboxen, null, 2)}
            </pre>
          )}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Zuletzt geändert: {new Date(einstellungen.updated_at).toLocaleString('de-CH')}
      </div>
    </div>
  );
}
