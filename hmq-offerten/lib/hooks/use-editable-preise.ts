'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Offerte, GespeicherteKostenWerte } from '@/lib/types';
import { KostenBasiswerte } from '@/lib/supabase';
import { KostenErgebnis } from '@/lib/kosten-rechner';
import { rundeAuf5Rappen } from '@/lib/kosten-helpers';

// State für editierbare Preise
export interface EditablePreise {
  grundlagen: number;
  termin: number;
  aufnahme: number;
  bericht: number;
  kontrolle: number;
  abschluss: number;
  material: number;
  spesen: number;
  zwischentotal: number;
}

interface UseEditablePreiseResult {
  editablePreise: EditablePreise;
  setEditablePreise: React.Dispatch<React.SetStateAction<EditablePreise>>;
  manuallyChanged: Set<keyof EditablePreise>;
  setManuallyChanged: React.Dispatch<React.SetStateAction<Set<keyof EditablePreise>>>;
  handlePreisChange: (field: keyof EditablePreise, value: number) => void;
  isManuallyChanged: (field: keyof EditablePreise) => boolean;
  initialized: boolean;
  prevKategorienRef: React.MutableRefObject<string>;
  prevSpesenRef: React.MutableRefObject<string>;
}

export function useEditablePreise(
  offerte: Offerte,
  onChange: (offerte: Offerte) => void,
  ergebnis: KostenErgebnis | null,
  basiswerte: KostenBasiswerte | null,
  setEinsatzpauschaleManual: (value: boolean) => void
): UseEditablePreiseResult {
  const [editablePreise, setEditablePreise] = useState<EditablePreise>({
    grundlagen: 0,
    termin: 0,
    aufnahme: 0,
    bericht: 0,
    kontrolle: 0,
    abschluss: 0,
    material: 0,
    spesen: 0,
    zwischentotal: 0,
  });

  const [manuallyChanged, setManuallyChanged] = useState<Set<keyof EditablePreise>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Track wenn Kategorien/Spesen geändert werden
  const prevKategorienRef = useRef<string>('');
  const prevSpesenRef = useRef<string>('');
  const prevOffertnummerRef = useRef<string>('');

  // Initialisierung: Lade gespeicherte Werte oder berechne neu
  useEffect(() => {
    if (!ergebnis || !basiswerte || initialized) return;

    const gespeichert = offerte.kostenBerechnung.gespeicherteWerte;

    if (gespeichert) {
      const geladenePreise: EditablePreise = {
        grundlagen: gespeichert.grundlagen,
        termin: gespeichert.termin,
        aufnahme: gespeichert.aufnahme,
        bericht: gespeichert.bericht,
        kontrolle: gespeichert.kontrolle,
        abschluss: gespeichert.abschluss,
        material: gespeichert.material,
        spesen: gespeichert.spesen,
        zwischentotal: gespeichert.zwischentotal,
      };
      setEditablePreise(geladenePreise);

      const berechnete: EditablePreise = {
        grundlagen: ergebnis.grundlagen.betrag,
        termin: ergebnis.termin.betrag,
        aufnahme: ergebnis.aufnahme.betrag,
        bericht: ergebnis.bericht.betrag,
        kontrolle: ergebnis.kontrolle.betrag,
        abschluss: ergebnis.zustellbestaetigung.betrag + ergebnis.datenabgabe.betrag,
        material: ergebnis.usb.betrag + ergebnis.binden.betrag,
        spesen: ergebnis.spesen.betrag,
        zwischentotal: ergebnis.endpreis,
      };

      const changedFields = new Set<keyof EditablePreise>();
      (Object.keys(geladenePreise) as (keyof EditablePreise)[]).forEach(key => {
        if (Math.abs(geladenePreise[key] - berechnete[key]) >= 0.01) {
          changedFields.add(key);
        }
      });
      setManuallyChanged(changedFields);
    } else {
      const neuePreise: EditablePreise = {
        grundlagen: ergebnis.grundlagen.betrag,
        termin: ergebnis.termin.betrag,
        aufnahme: ergebnis.aufnahme.betrag,
        bericht: ergebnis.bericht.betrag,
        kontrolle: ergebnis.kontrolle.betrag,
        abschluss: ergebnis.zustellbestaetigung.betrag + ergebnis.datenabgabe.betrag,
        material: ergebnis.usb.betrag + ergebnis.binden.betrag,
        spesen: ergebnis.spesen.betrag,
        zwischentotal: ergebnis.endpreis,
      };
      setEditablePreise(neuePreise);
      setManuallyChanged(new Set());
    }

    prevKategorienRef.current = JSON.stringify(offerte.kostenBerechnung.kategorien);
    prevSpesenRef.current = JSON.stringify(offerte.kostenBerechnung.spesen);
    prevOffertnummerRef.current = offerte.offertnummer;
    setInitialized(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only deps that trigger re-init
  }, [ergebnis, basiswerte, initialized, offerte.kostenBerechnung.gespeicherteWerte]);

  // Bei Wechsel der Offerte: Reset
  useEffect(() => {
    if (prevOffertnummerRef.current !== '' && prevOffertnummerRef.current !== offerte.offertnummer) {
      setInitialized(false);
      setManuallyChanged(new Set());
    }
  }, [offerte.offertnummer]);

  // Wenn Kategorien oder Spesen geändert werden -> alle Preise neu berechnen
  useEffect(() => {
    if (!ergebnis || !initialized) return;

    const kategorienStr = JSON.stringify(offerte.kostenBerechnung.kategorien);
    const spesenStr = JSON.stringify(offerte.kostenBerechnung.spesen);

    const kategorienChanged = prevKategorienRef.current !== '' && prevKategorienRef.current !== kategorienStr;
    const spesenChanged = prevSpesenRef.current !== '' && prevSpesenRef.current !== spesenStr;

    if (kategorienChanged || spesenChanged) {
      const neuePreise: EditablePreise = {
        grundlagen: ergebnis.grundlagen.betrag,
        termin: ergebnis.termin.betrag,
        aufnahme: ergebnis.aufnahme.betrag,
        bericht: ergebnis.bericht.betrag,
        kontrolle: ergebnis.kontrolle.betrag,
        abschluss: ergebnis.zustellbestaetigung.betrag + ergebnis.datenabgabe.betrag,
        material: ergebnis.usb.betrag + ergebnis.binden.betrag,
        spesen: ergebnis.spesen.betrag,
        zwischentotal: ergebnis.endpreis,
      };
      setEditablePreise(neuePreise);
      setManuallyChanged(new Set());

      onChange({
        ...offerte,
        kostenBerechnung: {
          ...offerte.kostenBerechnung,
          overrides: { stundenEnd: null, bindemengeEnd: null },
          gespeicherteWerte: undefined,
        },
      });
    }

    prevKategorienRef.current = kategorienStr;
    prevSpesenRef.current = spesenStr;

    if (kategorienChanged) {
      setEinsatzpauschaleManual(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only react to kategorien/spesen/initialized changes
  }, [ergebnis, offerte.kostenBerechnung.kategorien, offerte.kostenBerechnung.spesen, initialized]);

  // Update offerte.kosten.leistungspreis wenn Zwischentotal geändert wird
  useEffect(() => {
    if (editablePreise.zwischentotal !== offerte.kosten.leistungspreis && initialized) {
      onChange({ ...offerte, kosten: { ...offerte.kosten, leistungspreis: editablePreise.zwischentotal } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only react to zwischentotal changes
  }, [editablePreise.zwischentotal, initialized]);

  // Speichere aktuelle Werte als gespeicherteWerte wenn sich editablePreise ändert
  const updateGespeicherteWerte = useCallback(() => {
    if (!basiswerte || !ergebnis || !initialized) return;

    const rabattBetrag = rundeAuf5Rappen(editablePreise.zwischentotal * (offerte.kosten.rabattProzent / 100));
    const totalNachRabatt = rundeAuf5Rappen(editablePreise.zwischentotal - rabattBetrag);
    const mwstBetrag = rundeAuf5Rappen(totalNachRabatt * 0.081);
    const totalInklMwst = rundeAuf5Rappen(totalNachRabatt + mwstBetrag);

    const gespeicherteWerte: GespeicherteKostenWerte = {
      grundlagen: editablePreise.grundlagen,
      termin: editablePreise.termin,
      aufnahme: editablePreise.aufnahme,
      aufnahmeStunden: ergebnis.aufnahme.stundenEnd,
      bericht: editablePreise.bericht,
      kontrolle: editablePreise.kontrolle,
      abschluss: editablePreise.abschluss,
      material: editablePreise.material,
      materialUsbKosten: basiswerte.usb_pauschal,
      materialBindeAnzahl: ergebnis.binden.mengeEnd,
      materialBindeKosten: ergebnis.binden.betrag,
      spesen: editablePreise.spesen,
      zwischentotal: editablePreise.zwischentotal,
      rabattProzent: offerte.kosten.rabattProzent,
      rabattBetrag,
      mwstBetrag,
      totalInklMwst,
    };

    // Nur updaten wenn sich Werte geändert haben
    const current = offerte.kostenBerechnung.gespeicherteWerte;
    if (JSON.stringify(current) !== JSON.stringify(gespeicherteWerte)) {
      onChange({
        ...offerte,
        kostenBerechnung: {
          ...offerte.kostenBerechnung,
          gespeicherteWerte,
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onChange identity is stable from parent
  }, [editablePreise, offerte.kosten.rabattProzent, basiswerte, ergebnis, initialized]);

  // Debounced Update der gespeicherten Werte
  useEffect(() => {
    if (!initialized) return;
    const timeout = setTimeout(updateGespeicherteWerte, 300);
    return () => clearTimeout(timeout);
  }, [editablePreise, offerte.kosten.rabattProzent, updateGespeicherteWerte, initialized]);

  const handlePreisChange = useCallback((field: keyof EditablePreise, value: number) => {
    const rounded = rundeAuf5Rappen(value);
    setEditablePreise(prev => {
      const updated = { ...prev, [field]: rounded };
      // Wenn eine Position geändert wird, berechne Zwischentotal neu
      if (field !== 'zwischentotal') {
        updated.zwischentotal = rundeAuf5Rappen(
          updated.grundlagen + updated.termin + updated.aufnahme +
          updated.bericht + updated.kontrolle + updated.abschluss +
          updated.material + updated.spesen
        );
      }
      return updated;
    });
    setManuallyChanged(prev => new Set([...prev, field]));
  }, []);

  // Prüft ob ein Wert manuell geändert wurde
  function isManuallyChanged(field: keyof EditablePreise): boolean {
    return manuallyChanged.has(field);
  }

  return {
    editablePreise,
    setEditablePreise,
    manuallyChanged,
    setManuallyChanged,
    handlePreisChange,
    isManuallyChanged,
    initialized,
    prevKategorienRef,
    prevSpesenRef,
  };
}
