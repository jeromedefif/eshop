# Místní vzhled VINARIA

Integrace schváleného grafického návrhu z ceníků VINARIA. Po místním schválení uživatelem určeno k produkčnímu nasazení dne 23. 10. 2026.

## Rozsah
- Originální pečeť VINARIA v hlavičce a patičce (`public/brand/logo-vinaria.png`); zobrazovaná přes optimalizaci Next Image.
- Font Noto Sans ze stejného firemního podkladu, beze změny glyfů převedený do WOFF. Používá se v hlavičce a patičce; typografie produktového seznamu zůstává zachovaná.
- `CustomerBrandTheme` sjednocuje zákaznickou část včetně načítání, profilu, objednávek, košíku, kontroly objednávky, přihlášení, registrace, veřejného katalogu a detailu produktu. Administrace je oddělená.
- `customer-brand.css` mění pouze barevné vlastnosti existujících stavů: pozadí, text, rámeček, gradient, fokus a zvýraznění. Rozvržení, URL, množství ani obsluha tlačítek se nemění.
- SVG kategorií mají `data-category-icon` a zachovávají původní paletu. Zelené a červené stavové informace zachovávají svůj význam.
- Změny se vztahují i na dialogy vykreslené mimo hlavní kontejner. Přepnutím na /admin se zákaznická paleta odstraní.
- Náhled horního proužku v administraci odpovídá nové vínové hlavičce; ukládání ani střídání zpráv se nemění.
- Lokální přepínač původního rozložení hlavičky zůstává; na mobilu je posunutý nad plovoucí objednávkové tlačítko. Nevrací celou barevnou paletu. Kompletní návrat vzhledu je možný obnovením souborů z předchozího commitu.

## Ověření
- TypeScript a cílený ESLint.
- Katalog, profil, Moje objednávky, prázdný košík, veřejný katalog, detail produktu a formulář obnovy hesla v místním prohlížeči.
- Přechod z profilu do objednávek zachovává stejné barvy.
- Barevnost ikon kategorií a šířka košíku 320 px bez vodorovného přetékání.
- Administrace zůstává modrá, zákaznická část je vínová.
- Přihlašovací a registrační formuláře používají stejný AuthPageShell; přihlášený uživatel je přesměrovaný zpět do katalogu, proto nebylo kvůli kontrole vzhledu prováděné odhlášení.
- Objednávka nebyla odesílaná, profil nebyl ukládaný a synchronizace košíku nebyla měněná. Naplněný závěrečný krok nebyl zkoušen skutečnou objednávkou; používá společnou paletu.
