# Lokální náhled nové hlavičky

Nová hlavička prošla místním schválením a je výchozí i pro produkční sestavení. Databáze, synchronizace košíku a serverové odesílání objednávek se nemění.

- `app/components/header/LegacyHeader.tsx` obsahuje původní hlavičku beze změn kromě relativní cesty ke Cart. `LegacyPublicHeader.tsx` je původní veřejná hlavička.
- `ModernHeader.tsx` používá existující AuthContext, CartContext a useQuickReorder. Neukládá vlastní košík a nemění vytváření objednávek.
- `ModernPublicHeader.tsx` má stejný veřejný Auth listener jako původní hlavička.
- `HeaderChrome.tsx` sdílí původní logo, informační pruh a rozbalovací nabídky ovladatelné kliknutím, klávesnicí a Esc.
- Katalog, jeho kategorie, filtry a produktové řádky nejsou upravené. Pouze CSS odsazení sticky panelu sleduje skutečnou výšku nové hlavičky. Stejně se odsazuje potvrzovací panel v checkoutu.

## Návrat k původní hlavičce
V lokálním portálu je vpravo dole tlačítko `Lokální náhled · Původní hlavička`. Přepnutí je uložené v prohlížeči pod klíčem `beginy-header-preview-v1`; nezasahuje do účtu ani košíku. Opětovným kliknutím lze vrátit novou variantu.

Produkce používá schválenou novou hlavičku. Pro návrat původní varianty nastavte při sestavení `NEXT_PUBLIC_CUSTOMER_HEADER=legacy` a znovu nasaďte. Úplný návrat celé úpravy je možný přepnutím na předchozí nasazení. Místní přepínač se v produkci nezobrazuje.

## Provedená kontrola
- TypeScript a cílený ESLint.
- Skutečný lokální katalog s novou hlavičkou a původními kategoriemi/řádky.
- Přepnutí na původní variantu a zpět.
- Dostupnost profilu a administrace, zavření nabídky přes Esc.
- Mobilní navigace a nápověda; hlavička nepřetéká při šířce 320 px.
- Odsazení sticky panelu odpovídá výšce hlavičky (390 px: 156 px).
- Nebyly zadávány objednávky, měněn košík, odhlašován uživatel ani upravována databáze. Zobrazení pouze PET/plynů je implementované; s ostrými položkami nebylo proklikávané.

Uživatel schválil místní vzhled a nasazení 19. 10. 2026. Fyzické zařízení a režim návštěvníka s odhlášeným účtem nejsou tímto ověřené.

## Sjednocení košíku
Nová hlavička odkazuje přímo na /order-summary. Stránka se zákazníkovi jmenuje Košík. Boční Cart zůstává pouze v LegacyHeader pro návrat původní varianty. CartTools na stránce košíku zachovává uložení šablony a vyprázdnění s potvrzením. Kroky, navigační texty a nápověda používají Košík → Kontrola a odeslání → Objednávka přijata. URL, klíče konceptů, analytické události a serverové odesílání se nemění.

## Dokončení objednávky
Jedna karta obsahuje celkové litry, PET a plyny, rozbalovací položky a fakturační údaje a stručné doručení. Na počítači je odeslání dostupné u souhrnu i na konci, na mobilu je přichycené dole. Stejně je na mobilu přichycené pokračování z košíku. Obsluha načítání a odesílání objednávky zůstala beze změny.
