import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HMQ Offerten-Generator',
  description: 'Professionelle Offerten für Beweissicherung erstellen',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-gray-50 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
