'use client';

import { useState, useCallback, useEffect } from 'react';
import { Offerte, createEmptyOfferte } from '@/lib/types';
import { saveOfferte, getOffertenListe, getOfferte, deleteOfferte } from '@/lib/supabase';
import AppLayout from '@/components/layout/AppLayout';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import Tab1Daten from '@/components/offerte/Tab1Daten';
import Tab2Kosten from '@/components/offerte/Tab2Kosten';

interface OfferteListItem {
  id: string;
  offertnummer: string;
  projekt_ort: string | null;
  projekt_bezeichnung: string | null;
  updated_at: string;
}

const TABS = [
  {
    id: 'daten',
    label: 'Offertdaten',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'kosten',
    label: 'Kosten',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function HomePage() {
  const [offerte, setOfferte] = useState<Offerte>(createEmptyOfferte());
  const [activeTab, setActiveTab] = useState('daten');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Offerten modal state
  const [showOffertenModal, setShowOffertenModal] = useState(false);
  const [offerten, setOfferten] = useState<OfferteListItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function loadOfferten() {
    try {
      setLoadingHistory(true);
      const data = await getOffertenListe();
      setOfferten(data);
    } catch (err) {
      console.error('Fehler beim Laden der Offerten:', err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleLoadOfferte(offertnummer: string) {
    try {
      setLoadingId(offertnummer);
      const data = await getOfferte(offertnummer);
      if (data?.offerte_data) {
        setOfferte(data.offerte_data as Offerte);
        setErrors({});
        setActiveTab('daten');
        setShowOffertenModal(false);
      }
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDeleteOfferte(offertnummer: string) {
    if (!confirm(`Offerte ${offertnummer} wirklich löschen?`)) return;
    try {
      await deleteOfferte(offertnummer);
      setOfferten(offerten.filter((o) => o.offertnummer !== offertnummer));
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
    }
  }

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!offerte.offertnummer.trim()) newErrors.offertnummer = 'Offertnummer ist erforderlich';
    if (!offerte.empfaenger.firma.trim()) newErrors['empfaenger.firma'] = 'Firma ist erforderlich';
    if (!offerte.empfaenger.strasse.trim()) newErrors['empfaenger.strasse'] = 'Strasse ist erforderlich';
    if (!offerte.empfaenger.plz.trim()) newErrors['empfaenger.plz'] = 'PLZ ist erforderlich';
    if (!offerte.empfaenger.ort.trim()) newErrors['empfaenger.ort'] = 'Ort ist erforderlich';
    if (!offerte.projekt.ort.trim()) newErrors['projekt.ort'] = 'Projektort ist erforderlich';
    if (!offerte.projekt.bezeichnung.trim()) newErrors['projekt.bezeichnung'] = 'Projektbezeichnung ist erforderlich';
    if (offerte.kosten.leistungspreis <= 0) newErrors['kosten.leistungspreis'] = 'Leistungspreis muss grösser als 0 sein';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors['kosten.leistungspreis']) {
        setActiveTab('kosten');
      } else {
        setActiveTab('daten');
      }
    }

    return Object.keys(newErrors).length === 0;
  }, [offerte]);

  const handleGenerate = async () => {
    if (!validate()) return;

    setIsGenerating(true);
    try {
      await saveOfferte(offerte);

      const response = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerte),
      });

      if (!response.ok) throw new Error('Fehler beim Generieren der Offerte');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Offerte_${offerte.offertnummer.replace(/\./g, '-')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Fehler:', error);
      alert('Fehler beim Generieren der Offerte. Bitte versuchen Sie es erneut.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    if (confirm('Möchten Sie das Formular wirklich zurücksetzen?')) {
      setOfferte(createEmptyOfferte());
      setErrors({});
      setActiveTab('daten');
    }
  };

  const handleOpenOfferten = () => {
    loadOfferten();
    setShowOffertenModal(true);
  };

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  return (
    <AppLayout
      onOffertenClick={handleOpenOfferten}
      showNeueOfferte={offerte.offertnummer !== ''}
      onNeueOfferteClick={handleReset}
      currentOffertnummer={offerte.offertnummer || undefined}
    >
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Offerte erstellen</h1>
        <p className="mt-1 text-gray-500">Füllen Sie die Angaben aus und generieren Sie eine professionelle Word-Offerte.</p>
      </div>

      {/* Main Form Card */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <Tabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

        <div className="p-6 sm:p-8">
          <div className="animate-in fade-in duration-200">
            {activeTab === 'daten' && <Tab1Daten offerte={offerte} onChange={setOfferte} errors={errors} />}
            {activeTab === 'kosten' && <Tab2Kosten offerte={offerte} onChange={setOfferte} errors={errors} />}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <Button variant="ghost" onClick={handleReset}>
              Zurücksetzen
            </Button>

            <div className="flex gap-3">
              {activeTab === 'daten' && (
                <Button
                  variant="secondary"
                  onClick={() => setActiveTab('kosten')}
                  rightIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  }
                >
                  Weiter zu Kosten
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleGenerate}
                isLoading={isGenerating}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              >
                Word-Offerte generieren
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Offerten Modal */}
      {showOffertenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowOffertenModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Gespeicherte Offerten</h2>
              <button
                onClick={() => setShowOffertenModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {loadingHistory ? (
                <div className="p-8 text-center text-gray-500">Laden...</div>
              ) : offerten.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Keine Offerten vorhanden</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {offerten.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => handleLoadOfferte(item.offertnummer)}
                            disabled={loadingId === item.offertnummer}
                            className="text-base font-medium text-[#1e3a5f] hover:underline text-left"
                          >
                            {loadingId === item.offertnummer ? 'Laden...' : item.offertnummer}
                          </button>
                          <p className="text-sm text-gray-600 mt-1">
                            {item.projekt_ort && <span>{item.projekt_ort}</span>}
                            {item.projekt_ort && item.projekt_bezeichnung && <span> — </span>}
                            {item.projekt_bezeichnung && <span>{item.projekt_bezeichnung}</span>}
                            {!item.projekt_ort && !item.projekt_bezeichnung && <span className="text-gray-400">Kein Projekt</span>}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Zuletzt geändert: {formatDate(item.updated_at)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteOfferte(item.offertnummer)}
                          className="p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-red-50"
                          title="Löschen"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
