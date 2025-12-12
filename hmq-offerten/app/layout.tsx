import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'HMQ Offerten-Generator',
  description: 'Offerten für Beweissicherung erstellen',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-gray-100 min-h-screen font-sans">
        <nav className="bg-white border-b shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/offerte" className="flex items-center gap-2">
              <span className="text-xl font-bold text-blue-600">HMQ</span>
              <span className="text-gray-600">Offerten-Generator</span>
            </Link>
            <div className="flex gap-4">
              <Link href="/offerte" className="text-sm text-gray-600 hover:text-blue-600">Neue Offerte</Link>
              <Link href="/admin" className="text-sm text-gray-600 hover:text-blue-600">Admin</Link>
            </div>
          </div>
        </nav>
        <main className="py-8 px-4">{children}</main>
      </body>
    </html>
  );
}
