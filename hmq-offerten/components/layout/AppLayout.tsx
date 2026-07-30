'use client';

import { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AppLayoutProps {
  children: ReactNode;
  onOffertenClick?: () => void;
  showNeueOfferte?: boolean;
  onNeueOfferteClick?: () => void;
  currentOffertnummer?: string;
  currentProjekt?: string;
}

const navButton =
  'flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 rounded-xl smooth hover:bg-hmq-blue/8 hover:text-hmq-blue';

export default function AppLayout({
  children,
  onOffertenClick,
  showNeueOfferte = false,
  onNeueOfferteClick,
  currentOffertnummer,
  currentProjekt,
}: AppLayoutProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header mit HMQ Branding, unten abgeschlossen durch die Gradientleiste */}
      <header className="bg-white sticky top-0 z-40 shadow-card">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Links: HMQ Logo + App-Name */}
          <Link href="/" className="flex items-center gap-3.5">
            <Image src="/HMQ-Logo-rounded.svg" alt="HMQ" width={40} height={40} />
            <div className="border-l-2 border-gray-200 pl-3.5">
              <h1 className="text-[13px] font-bold uppercase tracking-[0.08em] text-gray-900 leading-snug">
                Beweissicherung
              </h1>
              <p className="text-xs text-gray-500 leading-snug">Offertgenerator</p>
            </div>
          </Link>

          {/* Mitte: Aktuelle Offerte */}
          {currentOffertnummer && !isAdmin && (
            <div className="flex items-center gap-2.5 px-4 py-1.5 bg-gray-50 border border-gray-200 rounded-full shadow-card min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-400 shrink-0">
                Aktiv
              </span>
              <span className="font-mono font-semibold text-hmq-blue shrink-0">{currentOffertnummer}</span>
              {currentProjekt && (
                <span
                  className="text-sm text-gray-500 truncate max-w-[320px]"
                  title={currentProjekt}
                >
                  &middot; {currentProjekt}
                </span>
              )}
            </div>
          )}

          {/* Rechts: Navigation */}
          <div className="flex items-center gap-2">
            {showNeueOfferte && onNeueOfferteClick && (
              <button onClick={onNeueOfferteClick} className={navButton}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neue Offerte
              </button>
            )}

            {onOffertenClick && !isAdmin && (
              <button onClick={onOffertenClick} className={navButton}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Offerten
              </button>
            )}

            <Link
              href={isAdmin ? '/' : '/admin'}
              className={
                isAdmin
                  ? 'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl smooth bg-hmq-blue/10 text-hmq-blue border border-hmq-blue/20'
                  : navButton
              }
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
        <div className="card-bar" />
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
