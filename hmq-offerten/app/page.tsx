'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Offerte, createEmptyOfferte } from '@/lib/types';
import { saveOfferte, getOffertenListe, getOfferte, deleteOfferte } from '@/lib/supabase';
import Tab1Daten from '@/components/offerte/Tab1Daten';
import Tab2Kosten from '@/components/offerte/Tab2Kosten';

type TabId = 'daten' | 'kosten';

interface HistorieEintrag {
  id: string;
  offertnummer: string;
  projekt_ort: string | null;
  projekt_bezeichnung: string | null;
  empfaenger_firma: string | null;
  updated_at: string;
}

export default function HomePage() {
  const [offerte, setOfferte] = useState<Offerte>(createEmptyOfferte());
  const [activeTab, setActiveTab] = useState<TabId>('daten');
  const [isSaved, setIsSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Offerten-Liste Modal
  const [offertenOpen, setOffertenOpen] = useState(false);
  const [offertenListe, setOffertenListe] = useState<HistorieEintrag[]>([]);
  const [offertenLoading, setOffertenLoading] = useState(false);
  const [offertenSearch, setOffertenSearch] = useState('');

  async function loadOfferten() {
    setOffertenLoading(true);
    try {
      const liste = await getOffertenListe();
      setOffertenListe(liste);
    } catch (error) {
      console.error('Fehler:', error);
    }
    setOffertenLoading(false);
  }

  useEffect(() => {
    if (offertenOpen) loadOfferten();
  }, [offertenOpen]);

  function handleOfferteChange(newOfferte: Offerte) {
    setOfferte(newOfferte);
    setIsSaved(false);
  }

  function handleNeueOfferte() {
    if (offerte.offertnummer && !isSaved) {
      if (!confirm('Ungespeicherte Änderungen verwerfen?')) return;
    }
    setOfferte(createEmptyOfferte());
    setIsSaved(false);
    setActiveTab('daten');
  }

  function handleCreateNewFromImport(newOfferte: Offerte) {
    // Bei ungespeicherten Änderungen warnen
    if (offerte.offertnummer && !isSaved) {
      if (!confirm('Ungespeicherte Änderungen verwerfen und neue Offerte erstellen?')) return;
    }
    setOfferte(newOfferte);
    setIsSaved(false);
    setActiveTab('daten');
  }

  async function handleOfferteLoad(offertnummer: string) {
    try {
      const result = await getOfferte(offertnummer);
      if (result?.offerte_data) {
        setOfferte(result.offerte_data as Offerte);
        setIsSaved(true);
        setOffertenOpen(false);
        setActiveTab('daten');
      }
    } catch (error) {
      console.error('Fehler:', error);
      alert('Fehler beim Laden');
    }
  }

  async function handleOfferteDelete(e: React.MouseEvent, offertnummer: string) {
    e.stopPropagation();
    if (!confirm(`Offerte ${offertnummer} wirklich löschen?`)) return;
    try {
      await deleteOfferte(offertnummer);
      await loadOfferten();
      if (offerte.offertnummer === offertnummer) {
        setOfferte(createEmptyOfferte());
        setIsSaved(false);
      }
    } catch (error) {
      console.error('Fehler:', error);
    }
  }

  // Helper: Base64 zu Blob konvertieren und herunterladen
  function downloadBase64File(base64Data: string, filename: string, mimeType: string) {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async function handleGenerateWord() {
    if (!offerte.offertnummer) {
      alert('Bitte Offertnummer eingeben');
      setActiveTab('daten');
      return;
    }

    // Datum auf heute setzen
    const heute = new Date().toISOString().split('T')[0];
    const offerteAktualisiert = { ...offerte, datum: heute };
    setOfferte(offerteAktualisiert);

    setGenerating(true);
    try {
      await saveOfferte(offerteAktualisiert);
      setIsSaved(true);

      const response = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerteAktualisiert),
      });

      if (!response.ok) throw new Error('Fehler');

      const result = await response.json();

      // DOCX herunterladen
      if (result.docx) {
        downloadBase64File(
          result.docx.data,
          result.docx.filename,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
      }

      // PDF herunterladen (falls vorhanden)
      if (result.pdf) {
        // Kurze Verzögerung damit beide Downloads starten
        setTimeout(() => {
          downloadBase64File(
            result.pdf.data,
            result.pdf.filename,
            'application/pdf'
          );
        }, 500);
      }
    } catch (error) {
      console.error('Fehler:', error);
      alert('Fehler beim Generieren');
    }
    setGenerating(false);
  }

  async function handleSave() {
    if (!offerte.offertnummer) {
      alert('Bitte Offertnummer eingeben');
      setActiveTab('daten');
      return;
    }

    setSaving(true);
    try {
      await saveOfferte(offerte);
      setIsSaved(true);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern');
    }
    setSaving(false);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('de-CH', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  const filteredOfferten = offertenListe.filter(o => {
    const s = offertenSearch.toLowerCase();
    return o.offertnummer.toLowerCase().includes(s) ||
           o.projekt_ort?.toLowerCase().includes(s) ||
           o.projekt_bezeichnung?.toLowerCase().includes(s) ||
           o.empfaenger_firma?.toLowerCase().includes(s);
  });

  return (
    <AppLayout
      onOffertenClick={() => setOffertenOpen(true)}
      showNeueOfferte={true}
      onNeueOfferteClick={handleNeueOfferte}
      currentOffertnummer={offerte.offertnummer}
    >
      {/* Titel */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Offerte erstellen</h1>
        <p className="text-gray-500 mt-1">Füllen Sie die Daten aus und generieren Sie das Word-Dokument</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="inline-flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('daten')}
            className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'daten'
                ? 'bg-white text-[#1e3a5f] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Offert-Daten
          </button>
          <button
            onClick={() => setActiveTab('kosten')}
            className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'kosten'
                ? 'bg-white text-[#1e3a5f] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Kosten
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mb-8">
        {activeTab === 'daten' && (
          <Tab1Daten offerte={offerte} onChange={handleOfferteChange} onCreateNew={handleCreateNewFromImport} />
        )}
        {activeTab === 'kosten' && (
          <Tab2Kosten offerte={offerte} onChange={handleOfferteChange} />
        )}
      </div>

      {/* Footer mit Buttons */}
      <div className="flex items-center justify-between py-6 border-t border-gray-200">
        {/* Links: Status */}
        <div className="flex items-center gap-3">
          {offerte.offertnummer && (
            <div className="flex items-center gap-2 text-sm">
              {isSaved ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-700">Gespeichert</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-orange-600">Nicht gespeichert</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Rechts: Buttons */}
        <div className="flex items-center gap-3">
          {/* Speichern Button */}
          <button
            onClick={handleSave}
            disabled={saving || !offerte.offertnummer}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                Speichern...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Speichern
              </>
            )}
          </button>

          {/* Word generieren Button */}
          <button
            onClick={handleGenerateWord}
            disabled={generating || !offerte.offertnummer}
            className="flex items-center gap-3 px-8 py-3 bg-[#1e3a5f] text-white font-semibold rounded-xl hover:bg-[#162b47] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#1e3a5f]/20"
          >
            {generating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Generiere...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Word generieren
              </>
            )}
          </button>
        </div>
      </div>

      {/* OFFERTEN MODAL */}
      {offertenOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Offerten</h2>
                <p className="text-sm text-gray-500 mt-0.5">Wählen Sie eine Offerte zum Bearbeiten</p>
              </div>
              <button
                onClick={() => setOffertenOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Suche */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Suchen nach Nummer, Ort, Projekt, Firma..."
                  value={offertenSearch}
                  onChange={(e) => setOffertenSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/20"
                />
              </div>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-auto">
              {offertenLoading ? (
                <div className="p-12 text-center">
                  <div className="inline-block w-8 h-8 border-3 border-[#1e3a5f] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredOfferten.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">
                    {offertenSearch ? 'Keine Treffer gefunden' : 'Noch keine Offerten gespeichert'}
                  </p>
                </div>
              ) : (
                <div className="p-3">
                  {filteredOfferten.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => handleOfferteLoad(o.offertnummer)}
                      className={`p-4 rounded-xl cursor-pointer transition-all mb-2 ${
                        o.offertnummer === offerte.offertnummer
                          ? 'bg-[#1e3a5f]/10 border-2 border-[#1e3a5f]/30'
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-[#1e3a5f] text-lg">
                              {o.offertnummer}
                            </span>
                            {o.offertnummer === offerte.offertnummer && (
                              <span className="text-xs font-medium bg-[#1e3a5f] text-white px-2 py-0.5 rounded-full">
                                Aktiv
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            {o.empfaenger_firma && <span>{o.empfaenger_firma}</span>}
                            {o.empfaenger_firma && o.projekt_ort && <span>•</span>}
                            {o.projekt_ort && <span>{o.projekt_ort}</span>}
                          </div>
                          {o.projekt_bezeichnung && (
                            <p className="text-sm text-gray-500 mt-1 truncate">{o.projekt_bezeichnung}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">{formatDate(o.updated_at)}</p>
                        </div>
                        <button
                          onClick={(e) => handleOfferteDelete(e, o.offertnummer)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-sm text-gray-500">
              {offertenListe.length} Offerte{offertenListe.length !== 1 ? 'n' : ''} gespeichert
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
