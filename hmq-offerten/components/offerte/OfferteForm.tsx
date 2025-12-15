'use client';

import { useState, useCallback } from 'react';
import { Offerte, createEmptyOfferte } from '@/lib/types';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import Tab1Daten from './Tab1Daten';
import Tab2Kosten from './Tab2Kosten';

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

export default function OfferteForm() {
  const [offerte, setOfferte] = useState<Offerte>(createEmptyOfferte());
  const [activeTab, setActiveTab] = useState('daten');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!offerte.offertnummer.trim()) newErrors.offertnummer = 'Offertnummer ist erforderlich';
    if (!offerte.empfaenger.name.trim()) newErrors['empfaenger.name'] = 'Name ist erforderlich';
    if (!offerte.empfaenger.strasse.trim()) newErrors['empfaenger.strasse'] = 'Strasse ist erforderlich';
    if (!offerte.empfaenger.plzOrt.trim()) newErrors['empfaenger.plzOrt'] = 'PLZ/Ort ist erforderlich';
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

  return (
    <div className="bg-white shadow-card rounded-2xl overflow-hidden">
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
  );
}
