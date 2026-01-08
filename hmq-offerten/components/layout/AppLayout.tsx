'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AppLayoutProps {
  children: ReactNode;
  onOffertenClick?: () => void;
  showNeueOfferte?: boolean;
  onNeueOfferteClick?: () => void;
  currentOffertnummer?: string;
}

export default function AppLayout({
  children,
  onOffertenClick,
  showNeueOfferte = false,
  onNeueOfferteClick,
  currentOffertnummer,
}: AppLayoutProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header mit HMQ Branding */}
      <header className="bg-[#166ab8] text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Links: HMQ Logo + App-Name */}
          <Link href="/" className="flex items-center gap-4">
            <img src="/HMQ-Logo-weiss.svg" alt="HMQ" className="h-10 w-10" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Beweissicherung</h1>
              <p className="text-sm text-blue-200 leading-tight">Offertgenerator</p>
            </div>
          </Link>

          {/* Mitte: Aktuelle Offerte */}
          {currentOffertnummer && !isAdmin && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
              <span className="text-sm text-blue-200">Aktiv:</span>
              <span className="font-mono font-semibold text-white">{currentOffertnummer}</span>
            </div>
          )}

          {/* Rechts: Navigation */}
          <div className="flex items-center gap-2">
            {showNeueOfferte && onNeueOfferteClick && (
              <button
                onClick={onNeueOfferteClick}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neue Offerte
              </button>
            )}

            {onOffertenClick && !isAdmin && (
              <button
                onClick={onOffertenClick}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Offerten
              </button>
            )}

            <Link
              href={isAdmin ? '/' : '/admin'}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                isAdmin
                  ? 'bg-white text-[#166ab8]'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {isAdmin ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Zurück
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin-Bereich
                </>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
