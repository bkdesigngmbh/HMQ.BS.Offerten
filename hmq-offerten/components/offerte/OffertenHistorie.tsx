'use client';

import { useState, useEffect } from 'react';
import { getOffertenListe, getOfferte, deleteOfferte } from '@/lib/supabase';
import { Offerte } from '@/lib/types';

interface OffertenHistorieProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (offerte: Offerte) => void;
}

interface OfferteListItem {
  id: string;
  offertnummer: string;
  projekt_ort: string | null;
  projekt_bezeichnung: string | null;
  updated_at: string;
}

export default function OffertenHistorie({ isOpen, onClose, onLoad }: OffertenHistorieProps) {
  const [offerten, setOfferten] = useState<OfferteListItem[]>([]);
  const [filteredOfferten, setFilteredOfferten] = useState<OfferteListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadOfferten();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOfferten(offerten);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredOfferten(
        offerten.filter(
          (o) =>
            o.offertnummer.toLowerCase().includes(term) ||
            o.projekt_ort?.toLowerCase().includes(term) ||
            o.projekt_bezeichnung?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, offerten]);

  async function loadOfferten() {
    try {
      setLoading(true);
      setError(null);
      const data = await getOffertenListe();
      setOfferten(data);
      setFilteredOfferten(data);
    } catch (err) {
      setError('Fehler beim Laden der Offerten');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoad(offertnummer: string) {
    try {
      setLoadingId(offertnummer);
      const data = await getOfferte(offertnummer);
      if (data?.offerte_data) {
        onLoad(data.offerte_data as Offerte);
        onClose();
      } else {
        setError('Offerte konnte nicht geladen werden');
      }
    } catch (err) {
      setError('Fehler beim Laden der Offerte');
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(offertnummer: string) {
    if (!confirm(`Offerte ${offertnummer} wirklich löschen?`)) return;

    try {
      await deleteOfferte(offertnummer);
      setOfferten(offerten.filter((o) => o.offertnummer !== offertnummer));
    } catch (err) {
      setError('Fehler beim Löschen');
      console.error(err);
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Offerten-Historie</h2>
                <p className="text-sm text-gray-500">{offerten.length} gespeicherte Offerten</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Suchen nach Nummer, Ort oder Bezeichnung..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-gray-500">Laden...</div>
            ) : filteredOfferten.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'Keine Offerten gefunden' : 'Noch keine Offerten gespeichert'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredOfferten.map((offerte) => (
                  <div
                    key={offerte.id}
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[#1e3a5f]">
                          {offerte.offertnummer}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {offerte.projekt_ort && offerte.projekt_bezeichnung
                          ? `${offerte.projekt_ort}, ${offerte.projekt_bezeichnung}`
                          : offerte.projekt_ort || offerte.projekt_bezeichnung || '-'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Geändert: {formatDate(offerte.updated_at)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleLoad(offerte.offertnummer)}
                        disabled={loadingId === offerte.offertnummer}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-[#1e3a5f] hover:bg-[#2a4a6f] rounded-lg transition-colors disabled:opacity-50"
                      >
                        {loadingId === offerte.offertnummer ? 'Laden...' : 'Laden'}
                      </button>
                      <button
                        onClick={() => handleDelete(offerte.offertnummer)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Löschen"
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
          <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Schliessen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
