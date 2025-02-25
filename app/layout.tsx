import localFont from "next/font/local";
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

export const metadata = {
  metadataBase: new URL('https://beginy.cz'),
  title: "VINARIA s.r.o.",
  description: "VINARIA, objednávky, B2B",
  alternates: {
    canonical: '/',
    languages: {
      'cs-CZ': '/',
    },
  },
  openGraph: {
    locale: 'cs_CZ',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="cs-CZ"
      translate="no"
      className="notranslate"
    >
      <head>
        <meta httpEquiv="Content-Language" content="cs-CZ" />
        <meta name="language" content="Czech" />
        <meta name="google" content="notranslate" />
        <meta name="translate" content="no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground notranslate`}
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
