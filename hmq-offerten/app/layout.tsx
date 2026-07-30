import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';

// Self-hosted at build time; feeds --font-sans in globals.css
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Beweissicherung - Offertgenerator | HMQ AG',
  description: 'Professionelle Offerten für Beweissicherung erstellen',
  icons: {
    icon: '/HMQ-Logo-rounded.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={dmSans.variable}>
      <body className="min-h-screen bg-gray-50 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
