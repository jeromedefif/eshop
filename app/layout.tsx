import localFont from "next/font/local";
import type { Metadata } from 'next';
import Providers from './providers'
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.beginy.cz'),
  title: {
    default: 'Velkoobchodní katalog vín a nápojů | Beginy.cz',
    template: '%s | Beginy.cz'
  },
  description: 'B2B objednávkový katalog vín, nápojů a vinařských potřeb společnosti VINARIA s.r.o.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Velkoobchodní katalog vín a nápojů | Beginy.cz',
    description: 'B2B objednávkový katalog společnosti VINARIA s.r.o.',
    url: '/',
    siteName: 'Beginy.cz',
    type: 'website',
    locale: 'cs_CZ',
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <Providers>
          <div className="min-h-screen bg-white">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
