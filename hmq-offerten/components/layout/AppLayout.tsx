'use client';

import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AppLayout({ children, sidebar, title, subtitle }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <div className="hidden sm:block">
                <span className="font-semibold text-[#1e3a5f] text-lg">HMQ</span>
                <span className="text-gray-400 mx-2">|</span>
                <span className="text-gray-600 text-sm">Offerten-Generator</span>
              </div>
            </a>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              <a
                href="/"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5 rounded-lg transition-colors"
              >
                Offerten
              </a>
              <a
                href="/admin"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5 rounded-lg transition-colors"
              >
                Einstellungen
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        {(title || subtitle) && (
          <div className="mb-8">
            {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          </div>
        )}

        {/* Content with optional Sidebar */}
        {sidebar ? (
          <div className="flex gap-8">
            {/* Main Content Area */}
            <div className="flex-1 min-w-0">{children}</div>

            {/* Sidebar */}
            <aside className="hidden lg:block w-80 flex-shrink-0">
              <div className="sticky top-24">{sidebar}</div>
            </aside>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} HMQ AG — Beweissicherung
          </p>
        </div>
      </footer>
    </div>
  );
}
