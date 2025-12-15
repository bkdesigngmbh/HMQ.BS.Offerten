'use client';

import { useState, useCallback } from 'react';
import { Offerte, createEmptyOfferte } from '@/lib/types';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import Tab1Daten from './Tab1Daten';
import Tab2Kosten from './Tab2Kosten';

export default function OfferteForm() {
  const [offerte, setOfferte] = useState<Offerte>(createEmptyOfferte());
  const [activeTab, setActiveTab] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!offerte.offertnummer.trim()) newErrors.offertnummer = 'Offertnummer ist erforderlich';
    if (!offerte.empfaenger.firma.trim()) newErrors['empfaenger.firma'] = 'Firma ist erforderlich';
    if (!offerte.empfaenger.strasse.trim()) newErrors['empfaenger.strasse'] = 'Strasse ist erforderlich';
    if (!offerte.empfaenger.plzOrt.trim()) newErrors['empfaenger.plzOrt'] = 'PLZ/Ort ist erforderlich';
    if (!offerte.projekt.ort.trim()) newErrors['projekt.ort'] = 'Projektort ist erforderlich';
    if (!offerte.projekt.bezeichnung.trim()) newErrors['projekt.bezeichnung'] = 'Projektbezeichnung ist erforderlich';
    if (offerte.kosten.leistungspreis <= 0) newErrors['kosten.leistungspreis'] = 'Leistungspreis muss grösser als 0 sein';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors['kosten.leistungspreis']) {
        setActiveTab(1);
      } else {
        setActiveTab(0);
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
      setActiveTab(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <Tabs tabs={['Offertdaten', 'Kosten']} activeIndex={activeTab} onChange={setActiveTab} />

        {activeTab === 0 && <Tab1Daten offerte={offerte} onChange={setOfferte} errors={errors} />}
        {activeTab === 1 && <Tab2Kosten offerte={offerte} onChange={setOfferte} errors={errors} />}

        <div className="mt-8 pt-6 border-t flex justify-between items-center">
          <Button variant="secondary" onClick={handleReset}>Zurücksetzen</Button>

          <div className="flex gap-3">
            {activeTab === 0 && (
              <Button variant="secondary" onClick={() => setActiveTab(1)}>Weiter zu Kosten →</Button>
            )}
            <Button variant="primary" onClick={handleGenerate} isLoading={isGenerating}>
              Word-Offerte generieren
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
