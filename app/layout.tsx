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

const siteStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://www.beginy.cz/#website',
      url: 'https://www.beginy.cz/',
      name: 'Beginy.cz',
      alternateName: 'VINARIA B2B',
      inLanguage: 'cs-CZ',
      publisher: { '@id': 'https://www.beginy.cz/#organization' }
    },
    {
      '@type': 'Organization',
      '@id': 'https://www.beginy.cz/#organization',
      name: 'VINARIA s.r.o.',
      alternateName: 'Beginy.cz',
      url: 'https://www.beginy.cz/',
      email: 'fiala@vinaria.cz',
      telephone: '+420734720994',
      sameAs: ['https://vinaria.cz/'],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: '+420734720994',
        email: 'fiala@vinaria.cz',
        availableLanguage: ['cs', 'sk']
      }
    }
  ]
};

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
  other: {
    'seznam-wmt': 'rBzZYXqHHDpvBim1U1OJo2M1QHaWKlmL',
    'google-site-verification': 'sIJsBcr19awNikNAkYvvHOQEp7wFHnTeneFwQPKbJtA'
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
        <meta httpEquiv="content-language" content="cs" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteStructuredData).replace(/</g, '\\u003c') }}
        />
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
