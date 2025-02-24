import { Metadata } from "next";

export const metadata: Metadata = {
  title: "VINARIA s.r.o.",
  description: "VINARIA, objednávky, B2B",
  // Přidáme metadata pro jazyk
  metadataBase: new URL('https://beginy.cz'),
  alternates: {
    canonical: '/',
    languages: {
      'cs-CZ': '/',
    },
  },
  // Explicitní nastavení jazyka
  other: {
    'Content-Language': 'cs',
  },
  // Nastavení pro Open Graph, aby i sdílené stránky měly správný jazyk
  openGraph: {
    locale: 'cs_CZ',
  }
};
