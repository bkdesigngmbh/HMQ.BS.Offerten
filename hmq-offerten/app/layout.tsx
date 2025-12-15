import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HMQ Offerten-Generator',
  description: 'Professionelle Offerten für Beweissicherung erstellen',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-[#f8f9fa]">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <a href="/offerte" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                  <span className="text-white font-display font-bold text-lg">H</span>
                </div>
                <div>
                  <span className="font-display font-semibold text-[#1e3a5f] text-lg">HMQ</span>
                  <span className="hidden sm:inline text-gray-400 mx-2">|</span>
                  <span className="hidden sm:inline text-gray-600 text-sm">Offerten-Generator</span>
                </div>
              </a>

              {/* Navigation */}
              <nav className="flex items-center gap-1">
                <a
                  href="/offerte"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5 rounded-lg transition-colors"
                >
                  Neue Offerte
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
        <main className="py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="mt-auto py-6 border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500">
              © {new Date().getFullYear()} HMQ AG — Beweissicherung
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
