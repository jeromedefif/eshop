'use client';

import Script from 'next/script';

export default function LanguageScript() {
  return (
    <Script
      id="language-detector"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          document.documentElement.lang = 'cs-CZ';
          document.documentElement.setAttribute('translate', 'no');
          document.documentElement.classList.add('notranslate');

          function ensureMetaTag(httpEquiv, content) {
            let meta = document.querySelector('meta[http-equiv="' + httpEquiv + '"]');
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

          let translateMeta = document.querySelector('meta[name="google"]');
          if (!translateMeta) {
            translateMeta = document.createElement('meta');
            translateMeta.setAttribute('name', 'google');
            translateMeta.setAttribute('content', 'notranslate');
            document.head.appendChild(translateMeta);
          }
        `,
      }}
    />
  );
}
