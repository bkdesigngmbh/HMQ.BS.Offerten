import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HMQ Offerten",
  description: "HMQ Bodenservice Offerten-System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased bg-gray-50 min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
