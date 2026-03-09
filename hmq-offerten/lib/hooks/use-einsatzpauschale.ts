'use client';

import { useEffect } from 'react';
import { Offerte } from '@/lib/types';
import { KostenErgebnis } from '@/lib/kosten-rechner';

export function useEinsatzpauschale(
  offerte: Offerte,
  onChange: (offerte: Offerte) => void,
  ergebnis: KostenErgebnis | null,
  initialized: boolean,
  einsatzpauschaleManual: boolean
): void {
  // Auto-berechne Einsatzpauschalen basierend auf Aufnahmezeit (wenn nicht manuell gesetzt)
  useEffect(() => {
    if (!ergebnis || !initialized || einsatzpauschaleManual) return;

    const stundenEnd = offerte.kostenBerechnung.overrides.stundenEnd ?? ergebnis.aufnahme.stundenEnd;
    const berechnetePauschalen = Math.max(1, Math.min(10, Math.ceil(stundenEnd / 8)));

    if (offerte.einsatzpauschalen !== berechnetePauschalen) {
      onChange({ ...offerte, einsatzpauschalen: berechnetePauschalen });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only react to specific value changes
  }, [ergebnis?.aufnahme.stundenEnd, offerte.kostenBerechnung.overrides.stundenEnd, initialized, einsatzpauschaleManual]);
}
