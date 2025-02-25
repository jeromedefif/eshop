'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useForceLanguage() {
  const pathname = usePathname();

  useEffect(() => {
    const setLanguageAttributes = () => {
      document.documentElement.lang = 'cs-CZ';
      document.documentElement.setAttribute('translate', 'no');
      document.documentElement.classList.add('notranslate');

      function ensureMetaTag(httpEquiv, content) {
        let meta = document.querySelector(`meta[http-equiv="${httpEquiv}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('http-equiv', httpEquiv);
          meta.setAttribute('content', content);
          document.head.appendChild(meta);
        } else {
          meta.setAttribute('content', content);
        }
      }

      ensureMetaTag('Content-Language', 'cs-CZ');
    };

    setLanguageAttributes();
    const checkInterval = setInterval(setLanguageAttributes, 1000);

    return () => clearInterval(checkInterval);
  }, [pathname]);
}
