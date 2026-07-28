'use client';

import { useEffect, useState } from 'react';
import { Offerte, createEmptyEmg, getOffertart } from '@/lib/types';
import { EmgBasiswerte, getEmgBasiswerte } from '@/lib/supabase';
import { erstelleEmgGespeicherteWerte } from '@/lib/emg-kosten-rechner';

interface UseEmgKostenResult {
  emgBasiswerte: EmgBasiswerte | null;
  // true = Laden fehlgeschlagen (z.B. Migration database/emg-migration.sql fehlt)
  emgFehler: boolean;
}

// Lädt die EMG-Basiswerte und hält offerte.emg.gespeicherteWerte aktuell,
// sobald EMG aktiv ist. Läuft auf Seitenebene, damit die Werte auch ohne
// Öffnen von Tab 2 für die Dokument-Generierung bereitstehen.
export function useEmgKosten(
  offerte: Offerte,
  onChange: (offerte: Offerte) => void
): UseEmgKostenResult {
  const [emgBasiswerte, setEmgBasiswerte] = useState<EmgBasiswerte | null>(null);
  const [emgFehler, setEmgFehler] = useState(false);

  useEffect(() => {
    getEmgBasiswerte()
      .then((werte) => {
        setEmgBasiswerte(werte);
        setEmgFehler(false);
      })
      .catch((error) => {
        console.error('EMG-Basiswerte nicht ladbar (Migration ausgeführt?):', error);
        setEmgFehler(true);
      });
  }, []);

  useEffect(() => {
    if (getOffertart(offerte) === 'bs' || !emgBasiswerte) return;

    const emg = offerte.emg ?? createEmptyEmg();
    const werte = erstelleEmgGespeicherteWerte(emg, emgBasiswerte);
    if (JSON.stringify(emg.gespeicherteWerte) !== JSON.stringify(werte)) {
      onChange({ ...offerte, emg: { ...emg, gespeicherteWerte: werte } });
    }
  }, [offerte, emgBasiswerte, onChange]);

  return { emgBasiswerte, emgFehler };
}
