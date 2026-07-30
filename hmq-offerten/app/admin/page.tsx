'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  getKategorien, createKategorie, updateKategorie, deleteKategorie,
  getBasiswerte, updateBasiswerte,
  getEmgBasiswerte, updateEmgBasiswerte,
  getEinstellungen, updateEinstellungen,
  getStandorte, updateStandort,
  KostenKategorie, KostenBasiswerte, EmgBasiswerte, AppEinstellungen, Standort,
} from '@/lib/supabase';
import KategorienTab from './components/KategorienTab';
import BasiswerteTab from './components/BasiswerteTab';
import EmgTab from './components/EmgTab';
import StandorteTab from './components/StandorteTab';
import AnsprechpartnerTab from './components/AnsprechpartnerTab';
import EinstellungenTab from './components/EinstellungenTab';

type AdminTab = 'kategorien' | 'basiswerte' | 'emg' | 'standorte' | 'ansprechpartner' | 'einstellungen';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('kategorien');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [kategorien, setKategorien] = useState<KostenKategorie[]>([]);
  const [basiswerte, setBasiswerte] = useState<KostenBasiswerte | null>(null);
  const [emgBasiswerte, setEmgBasiswerte] = useState<EmgBasiswerte | null>(null);
  const [einstellungen, setEinstellungen] = useState<AppEinstellungen | null>(null);
  const [standorte, setStandorte] = useState<Standort[]>([]);

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
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Daten konnten nicht geladen werden — bitte Verbindung prüfen und neu laden.' });
    }
    // EMG separat laden: fehlende Tabelle (Migration noch nicht ausgeführt)
    // darf die übrigen Tabs nicht blockieren, der EMG-Tab zeigt den Hinweis an
    try {
      setEmgBasiswerte(await getEmgBasiswerte());
    } catch (e) {
      console.error('EMG-Basiswerte nicht ladbar (Migration ausgeführt?):', e);
      setEmgBasiswerte(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: load data on mount
    loadAll();
  }, []);

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleSaveKat(kat: Partial<KostenKategorie>) {
    setSaving(true);
    try {
      if (kat.id) {
        await updateKategorie(kat.id, kat);
      } else {
        await createKategorie(kat);
      }
      showMessage('success', 'Gespeichert');
      await loadAll();
    } catch {
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
    } catch {
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
    } catch {
      showMessage('error', 'Fehler beim Speichern');
    }
    setSaving(false);
  }

  async function handleSaveEmg(e: React.FormEvent) {
    e.preventDefault();
    if (!emgBasiswerte) return;
    setSaving(true);
    try {
      await updateEmgBasiswerte(emgBasiswerte);
      showMessage('success', 'EMG-Basiswerte gespeichert');
    } catch {
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
    } catch {
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
    } catch {
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
    { id: 'emg', label: 'EMG' },
    { id: 'standorte', label: 'Standorte' },
    { id: 'ansprechpartner', label: 'Ansprechpartner' },
    { id: 'einstellungen', label: 'Einstellungen' },
  ];

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-hmq-blue/40 smooth";

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-hmq-blue border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Titel */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-hmq-ink tracking-tight">Admin-Bereich</h1>
        <p className="text-gray-500 mt-1">Verwalten Sie Kategorien, Basiswerte und Einstellungen</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-xl border smooth ${
                activeTab === tab.id
                  ? 'border-hmq-blue bg-hmq-blue/8 text-hmq-blue shadow-card-hover'
                  : 'border-gray-200 bg-white text-gray-600 shadow-card hover:border-hmq-blue hover:text-hmq-blue hover:-translate-y-[2px]'
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
      <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-200 tab-panel" key={activeTab}>
        {activeTab === 'kategorien' && (
          <KategorienTab
            kategorien={kategorien}
            setKategorien={setKategorien}
            saving={saving}
            onSaveKat={handleSaveKat}
            onDeleteKat={handleDeleteKat}
            onReorderSuccess={() => showMessage('success', 'Reihenfolge gespeichert')}
            onReorderError={() => showMessage('error', 'Fehler beim Speichern der Reihenfolge')}
            onReload={loadAll}
            inputClass={inputClass}
          />
        )}

        {activeTab === 'basiswerte' && basiswerte && (
          <BasiswerteTab
            basiswerte={basiswerte}
            setBasiswerte={setBasiswerte}
            saving={saving}
            onSave={handleSaveBasis}
            inputClass={inputClass}
          />
        )}

        {activeTab === 'emg' && (
          <EmgTab
            basiswerte={emgBasiswerte}
            setBasiswerte={setEmgBasiswerte}
            saving={saving}
            onSave={handleSaveEmg}
            inputClass={inputClass}
          />
        )}

        {activeTab === 'standorte' && (
          <StandorteTab
            standorte={standorte}
            onStandortChange={handleStandortChange}
            onSaveStandort={handleSaveStandort}
            saving={saving}
            inputClass={inputClass}
          />
        )}

        {activeTab === 'ansprechpartner' && <AnsprechpartnerTab />}

        {activeTab === 'einstellungen' && einstellungen && (
          <EinstellungenTab
            einstellungen={einstellungen}
            setEinstellungen={setEinstellungen}
            saving={saving}
            onSave={handleSaveEinst}
            inputClass={inputClass}
          />
        )}
      </div>
    </AppLayout>
  );
}
