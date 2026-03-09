'use client';

import { useState, useEffect } from 'react';
import { Offerte, KategorieEingabe } from '@/lib/types';
import { getKategorien, getBasiswerte, KostenKategorie, KostenBasiswerte } from '@/lib/supabase';

interface UseKostenConfigResult {
  kategorienConfig: KostenKategorie[];
  basiswerte: KostenBasiswerte | null;
  loading: boolean;
}

export function useKostenConfig(
  offerte: Offerte,
  onChange: (offerte: Offerte) => void
): UseKostenConfigResult {
  const [kategorienConfig, setKategorienConfig] = useState<KostenKategorie[]>([]);
  const [basiswerte, setBasiswerte] = useState<KostenBasiswerte | null>(null);
  const [loading, setLoading] = useState(true);

  // Lade Konfiguration beim Mount
  useEffect(() => {
    async function load() {
      try {
        const [kat, basis] = await Promise.all([getKategorien(), getBasiswerte()]);
        setKategorienConfig(kat);
        setBasiswerte(basis);

        // Merge: Gespeicherte Kategorien + neue Kategorien aus DB
        const gespeicherteKategorien = offerte.kostenBerechnung.kategorien || [];

        const gemergteKategorien: KategorieEingabe[] = kat
          .sort((a, b) => a.sortierung - b.sortierung)
          .map(dbKat => {
            const gespeichert = gespeicherteKategorien.find(
              gk => gk.kategorieId === dbKat.id
            );

            if (gespeichert) {
              return {
                kategorieId: dbKat.id,
                titel: dbKat.titel,
                anzahl: gespeichert.anzahl
              };
            } else {
              return {
                kategorieId: dbKat.id,
                titel: dbKat.titel,
                anzahl: 0
              };
            }
          });

        const hatSichGeaendert =
          gemergteKategorien.length !== gespeicherteKategorien.length ||
          gemergteKategorien.some((gk, idx) =>
            gespeicherteKategorien[idx]?.kategorieId !== gk.kategorieId ||
            gespeicherteKategorien[idx]?.titel !== gk.titel
          );

        if (hatSichGeaendert) {
          onChange({
            ...offerte,
            kostenBerechnung: { ...offerte.kostenBerechnung, kategorien: gemergteKategorien },
          });
        }
      } catch (error) {
        console.error('Fehler:', error);
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally runs only on mount
  }, []);

  return { kategorienConfig, basiswerte, loading };
}
