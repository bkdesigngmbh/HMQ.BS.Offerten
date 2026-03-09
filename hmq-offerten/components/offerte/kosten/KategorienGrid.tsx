'use client';

import { KategorieEingabe } from '@/lib/types';

interface KategorienGridProps {
  kategorien: KategorieEingabe[];
  onKategorieChange: (kategorieId: string, anzahl: number) => void;
  getBeschreibungForKategorie: (kategorieId: string) => string | undefined;
  totalN: number | undefined;
}

export default function KategorienGrid({
  kategorien,
  onKategorieChange,
  getBeschreibungForKategorie,
  totalN,
}: KategorienGridProps) {
  return (
    <>
      <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
        <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </div>
        Objekte nach Kategorie
      </h3>

      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {kategorien.map((kat) => {
          const beschreibung = getBeschreibungForKategorie(kat.kategorieId);
          return (
            <div key={kat.kategorieId} className="bg-gray-50 rounded-lg p-2">
              <div className="flex justify-between items-start mb-1.5">
                <label className="text-xs font-medium text-gray-600 leading-tight">{kat.titel}</label>
                <div className="group relative flex-shrink-0 ml-1">
                  <svg className="w-3.5 h-3.5 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="hidden group-hover:block absolute right-0 top-4 bg-gray-900 text-white text-xs p-2 rounded-lg w-48 z-10 shadow-lg">
                    {beschreibung || 'Keine Beschreibung hinterlegt'}
                  </div>
                </div>
              </div>
              <input
                type="number"
                min="0"
                value={kat.anzahl || ''}
                onChange={(e) => onKategorieChange(kat.kategorieId, parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-white border-0 rounded-md text-sm text-center focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all"
                placeholder="0"
              />
            </div>
          );
        })}
      </div>

      {totalN !== undefined && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
          <span className="text-sm text-gray-500">
            Total Objekte: <span className="font-semibold text-[#1e3a5f]">{totalN}</span>
          </span>
        </div>
      )}
    </>
  );
}
