# Denní TOP 10 – lokální implementace

Schválený grafický návrh připojený ke skutečným datům. Dne 24. 10. 2026 uživatelem schváleno k produkčnímu nasazení. Náhled: http://localhost:3000/?top=1

## Výpočet

Počet různých nezrušených objednávek obsahujících produkt. Všechny objemy se sčítají pod jedno ID produktu. Při shodě rozhodují litry, následně název a ID. Zahrnuty pouze kategorie Víno, Nápoje, Perlivé, Ovocné víno; bez burčáku, PET a plynů. Do nabídky vstupují pouze nearchivované produkty skladem. Pokud se produkt během dne stane nedostupným, klient jej skryje; pořadí zůstane platné a může obsahovat méně než deset položek.

Klíčem mezipaměti je kalendářní den v Europe/Prague. Období je 90 kalendářních dnů před začátkem tohoto dne, horní hranice půlnoci je výlučná. Všechny návštěvy používají shodný časový interval. První požadavek daného dne vytvoří výsledek v persistentní Next Data Cache; další požadavky jej přečtou. Nejde o cron spuštěný přesně v 00:00. Denní klíč se změní o půlnoci a další požadavek vypočítá nový žebříček. Výpočet se může opakovat při vyprázdnění cache nebo při souběžném prvním načtení; nejde o databázově uložený historický snapshot.

Použitý existující cache API: https://nextjs.org/docs/app/api-reference/functions/unstable_cache . Projekt nemá zapnuté Cache Components; jejich zavádění a změna konfigurace aplikace není součástí této úpravy.

## Oddělení od katalogu a bezpečnost

API /api/catalog/top10 čte data přes serverovou Prismu, v transakci READ ONLY s časovým omezením. Do prohlížeče vrací pouze deset ID a data platnosti, nikoli údaje zákazníků, objednávky nebo prodejní počty. Nevyžaduje migraci, nové granty ani přímý přístup k tabulkám z prohlížeče.

Katalog se načítá samostatně, na žebříček nečeká. Žebříček se připojí asynchronně. Chyba výpočtu nebo sítě zobrazí v TOP 10 možnost opakovat načtení a návrat do katalogu, objednávání pokračuje beze změny. API HTTP odpověď se nesmí vrátit ze zastaralé HTTP cache. Dlouho otevřená stránka obnoví žebříček po příští půlnoci, pozastavená záložka také při opětovném zviditelnění.

## Ovládání

Pozvánka pod oznámeními, bez nové záložky mezi kategoriemi. Po otevření se ve stejných řádcích zobrazí TOP 10 s odznaky pořadí. Běžné filtry zůstávají zachované odděleně od hledání uvnitř TOP 10. Návrat do katalogu je obnoví. Volba kategorie, oblíbených, novinek, akcí, filtrů nebo „Jen v košíku“ režim TOP 10 opustí. V režimu „Jen v košíku“ není pozvánka, aby nerušila rychlé objednání.

URL top=1 uchovává zvolený režim i při návratu z detailu; běžné filtry zůstávají v URL. Textové hledání uvnitř žebříčku má samostatný parametr topHledat. Žádné změny ukládání košíku, množství nebo odesílání objednávky.

## Ověření

- 49 automatických testů prošlo, 10 databázových integračních testů přeskočeno.
- Nové testy: půlnoc v českém čase, 23/25hodinové dny, 90denní hranice, denní klíč cache, omezení SQL a bezpečné API chyby.
- TypeScript a cílený ESLint; u ProductList zůstává původní upozornění na nepoužitou proměnnou error.
- Skutečný místní GET načetl deset produktů z produkčních dat, beze změny databáze.
- V prohlížeči ověřeno skutečné pořadí, návrat z detailu, zachování hledání a fokus klávesnice.
- Mobilní šířky 390 a 320 px bez vodorovného přetékání. Konzole bez chyb.
- Košík nebyl upravován a žádná objednávka nebyla odeslána.

## Štítky v běžném katalogu a detailu

Denní desítka má v běžném seznamu a mobilních kartách jemný zlatavý štítek TOP 10 bez pořadí, vedle Novinky/Akce. Stejný štítek se načítá asynchronně do detailu produktu. Nativní tooltip a text pro čtečky vysvětlují význam posledních 90 dní. V otevřeném žebříčku je podle následného požadavku zákazníka vedle číselného pořadí také stejný štítek TOP 10 jako v běžném katalogu.

Ověřen označený Cabernet Sauvignon polosuchý a neoznačené polosladké/suché varianty, detail produktu, mobil 390 px bez přetékání a žádná duplicita v TOP 10. TypeScript prošel; cílený ESLint pouze s původním upozorněním ProductList. Neproběhlo nasazení, změna košíku ani odeslání objednávky.

## Kompaktní záhlaví žebříčku

V režimu TOP 10 je jediný kompaktní panel s trofejí, nadpisem, krátkým popisem posledních 90 dní a návratem do katalogu. Technický řádek s datem a půlnocí je odstraněný. Nápověda a cenová nabídka se zobrazují pouze v běžném katalogu. Vstupní a návratové tlačítko sdílejí stejné styly, návrat má šipku doleva. Ověřeno lokálně na počítači a šířce 320 px; produkce beze změny.
