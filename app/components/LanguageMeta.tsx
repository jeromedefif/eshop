'use client';

import { useEffect } from 'react';

/**
 * Komponenta, která dynamicky nastavuje jazykové metatags pro všechny stránky aplikace
 * Tato komponenta nemá žádný vizuální výstup, pouze upravuje DOM
 */
export default function LanguageMeta() {
  useEffect(() => {
    // Kontrola, zda již existuje meta tag pro Content-Language
    const existingLangMeta = document.querySelector('meta[http-equiv="Content-Language"]');
    if (!existingLangMeta) {
      const langMeta = document.createElement('meta');
      langMeta.setAttribute('http-equiv', 'Content-Language');
      langMeta.setAttribute('content', 'cs-CZ');
      document.head.appendChild(langMeta);
    }

    // Přidání nebo aktualizace atributu lang na HTML elementu
    document.documentElement.lang = 'cs-CZ';

    // Kontrola, zda již existuje meta tag pro language
    const existingNameLangMeta = document.querySelector('meta[name="language"]');
    if (!existingNameLangMeta) {
      const nameLangMeta = document.createElement('meta');
      nameLangMeta.setAttribute('name', 'language');
      nameLangMeta.setAttribute('content', 'Czech');
      document.head.appendChild(nameLangMeta);
    }

    // Přidání nebo aktualizace titulu dokumentu (volitelné)
    if (!document.title) {
      document.title = 'VINARIA s.r.o.';
    }
  }, []);

  return null;
}
