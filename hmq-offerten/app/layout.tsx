import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Beweissicherung - Offertgenerator | HMQ AG',
  description: 'Professionelle Offerten für Beweissicherung erstellen',
  icons: {
    icon: '/HMQ-Logo-rounded.svg',
  },
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
