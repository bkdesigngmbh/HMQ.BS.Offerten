'use client';

import { Offerte } from '@/lib/types';
import { EditablePreise } from '@/lib/hooks/use-editable-preise';
import { rundeAuf5Rappen, formatCHF } from '@/lib/kosten-helpers';

// Editable price input component - MUST be outside the main component to prevent re-mounting
function EditablePreisInput({
  label,
  field,
  value,
  isChanged,
  onPreisChange
}: {
  label: string;
  field: string;
  value: number;
  isChanged: boolean;
  onPreisChange: (field: keyof EditablePreise, value: number) => void;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 group relative">
      <span className="text-gray-600 flex items-center gap-1.5">
        {label}
        {isChanged && (
          <span className="text-orange-500 text-xs font-medium">manuell</span>
        )}
      </span>
      <input
        type="number"
        min="0"
        step="0.05"
        value={value || ''}
        onChange={(e) => onPreisChange(field as keyof EditablePreise, parseFloat(e.target.value) || 0)}
        className={`w-24 px-2 py-1 text-right font-mono text-sm rounded-lg border-0
          ${isChanged ? 'bg-orange-50' : 'bg-gray-50'}
          focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all`}
        placeholder="0.00"
      />
    </div>
  );
}

interface KostenUebersichtProps {
  editablePreise: EditablePreise;
  isManuallyChanged: (field: keyof EditablePreise) => boolean;
  handlePreisChange: (field: keyof EditablePreise, value: number) => void;
  offerte: Offerte;
  onRabattChange: (rabattProzent: number) => void;
  showPositionen: boolean;
}

export default function KostenUebersicht({
  editablePreise,
  isManuallyChanged,
  handlePreisChange,
  offerte,
  onRabattChange,
  showPositionen,
}: KostenUebersichtProps) {
  const rabattBetrag = rundeAuf5Rappen(editablePreise.zwischentotal * (offerte.kosten.rabattProzent / 100));
  const totalNachRabatt = rundeAuf5Rappen(editablePreise.zwischentotal - rabattBetrag);
  const mwstBetrag = rundeAuf5Rappen(totalNachRabatt * 0.081); // 8.1% MwSt.
  const totalInklMwst = rundeAuf5Rappen(totalNachRabatt + mwstBetrag);

  return (
    <div className="space-y-4">
      {/* Kostenübersicht - editierbar */}
      {showPositionen && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Kostenübersicht</h3>
            <span
              className="text-xs text-gray-400 cursor-help"
              title="Alle Preise sind editierbar. Änderungen werden bei Anpassung der Kategorien oder Spesen zurückgesetzt."
            >
              editierbar
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <EditablePreisInput label="Grundlagen" field="grundlagen" value={editablePreise.grundlagen} isChanged={isManuallyChanged('grundlagen')} onPreisChange={handlePreisChange} />
            <EditablePreisInput label="Termin" field="termin" value={editablePreise.termin} isChanged={isManuallyChanged('termin')} onPreisChange={handlePreisChange} />
            <EditablePreisInput label="Aufnahme" field="aufnahme" value={editablePreise.aufnahme} isChanged={isManuallyChanged('aufnahme')} onPreisChange={handlePreisChange} />
            <EditablePreisInput label="Bericht" field="bericht" value={editablePreise.bericht} isChanged={isManuallyChanged('bericht')} onPreisChange={handlePreisChange} />
            <EditablePreisInput label="Kontrolle" field="kontrolle" value={editablePreise.kontrolle} isChanged={isManuallyChanged('kontrolle')} onPreisChange={handlePreisChange} />
            <EditablePreisInput label="Abschluss" field="abschluss" value={editablePreise.abschluss} isChanged={isManuallyChanged('abschluss')} onPreisChange={handlePreisChange} />
            <EditablePreisInput label="Material" field="material" value={editablePreise.material} isChanged={isManuallyChanged('material')} onPreisChange={handlePreisChange} />
            <EditablePreisInput label="Spesen" field="spesen" value={editablePreise.spesen} isChanged={isManuallyChanged('spesen')} onPreisChange={handlePreisChange} />
          </div>
        </div>
      )}

      {/* Total - dunkelblauerBlock */}
      <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] rounded-2xl p-6 text-white">
        {/* Zwischentotal - editierbar */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/80 flex items-center gap-1.5">
            Zwischentotal
            {isManuallyChanged('zwischentotal') && (
              <span className="text-orange-300 text-xs">manuell</span>
            )}
          </span>
          <input
            type="number"
            min="0"
            step="0.05"
            value={editablePreise.zwischentotal || ''}
            onChange={(e) => handlePreisChange('zwischentotal', parseFloat(e.target.value) || 0)}
            className={`w-28 px-2 py-1 rounded-lg text-sm text-right font-mono
              ${isManuallyChanged('zwischentotal') ? 'bg-orange-400/30' : 'bg-white/20'}
              border-0 text-white placeholder-white/50 focus:bg-white/30 focus:ring-0`}
            placeholder="0.00"
          />
        </div>

        {/* Rabatt */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/80">Rabatt</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={offerte.kosten.rabattProzent || ''}
              onChange={(e) => onRabattChange(parseFloat(e.target.value) || 0)}
              className="w-16 px-2 py-1 bg-white/20 border-0 rounded-lg text-sm text-center text-white placeholder-white/50 focus:bg-white/30 focus:ring-0"
              placeholder="0"
            />
            <span>%</span>
            {offerte.kosten.rabattProzent > 0 && (
              <span className="text-white/60 text-sm">(-{formatCHF(rabattBetrag)})</span>
            )}
          </div>
        </div>

        {/* Trennlinie */}
        <div className="border-t border-white/20 my-4"></div>

        {/* Total inkl. MwSt. */}
        <div className="flex justify-between items-center">
          <div>
            <span className="text-lg font-medium">Total inkl. MwSt.</span>
            <div className="text-white/60 text-xs">inkl. 8.1% MwSt. ({formatCHF(mwstBetrag)})</div>
          </div>
          <span className="text-2xl font-bold font-mono">
            CHF {formatCHF(totalInklMwst)}
          </span>
        </div>
      </div>

      {!showPositionen && (
        <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
          Wählen Sie mindestens eine Kategorie mit Anzahl &gt; 0
        </div>
      )}
    </div>
  );
}
