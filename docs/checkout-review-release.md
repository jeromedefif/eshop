# Úprava průchodu objednávkou – 29. 9. 2026

## Rozsah

- Souhrn → Kontrola a odeslání → Přijato, shodné šířky, pořadí položek a čitelné mobilní ovládání.
- Poznámka se ukládá při psaní do sessionStorage konkrétního účtu; zůstává při návratu, obnovení i úpravě profilu. Po úspěchu se odstraní.
- Koncept se před odesláním označí jako rozpracovaný pokus. Nejasný výsledek nezaloží nový klíč ani po návratu do souhrnu. Retry používá původní klíč.
- Síťový timeout 30 sekund; přehledná trvalá chyba a opakování / historie. Timeout neznamená, že server objednávku neuložil.
- Přijetí objednávky zůstává na obrazovce i po obnovení stránky (po dobu platnosti konceptu, 24 hodin), s číslem a odkazem do historie. Výsledek není závislý na úspěchu analytiky ani úklidu košíku.
- Kontaktní údaje se pro kontrolu načítají ze serveru. Nový klient pošle očekávané údaje; transakce zamkne profil a porovná jej před vytvořením objednávky. Změna vyžaduje novou kontrolu. Starší klient bez očekávaných údajů zůstává kompatibilní.
- Úspěšná odpověď vrací skutečně uložené kontaktní údaje, také při idempotentním opakování.
- Úklid po objednávce odstraňuje jen nezměněné objednané řádky. Ruční vyprázdnění košíku zůstává samostatnou akcí.

Výjimka burčáku a nastavení produktů se nemění. Není nutná migrace databáze ani změna prostředí.

## Ověření

- 31/31 Vitest testů včetně izolovaného PostgreSQL 17.11, syntetická data; žádný import produkčních dat.
- Nové testy: změna profilu, opakování již uložené objednávky se starým profilem, zachování konceptů/potvrzení, oddělení účtů, čištění poznámek a zachování nových řádků košíku.
- TypeScript prošel, ESLint bez chyb (čtyři existující upozornění mimo změny).
- Lokální Next.js build prošel; síťová izolace omezila načtení veřejného katalogu během prerenderingu. Před nasazením je nutný úspěšný vzdálený build.
- Prohlížeč: skutečné komponenty v izolovaném lokálním Vite náhledu s mockovaným účtem/API, externí požadavky blokované. Ověřeno obnovení poznámky, návrat přes profil, chyba 503, opakování stejného klíče, změna adresy 409, příjem objednávky a obnovení potvrzení, mobilní šířka 390 px, desktop 1280 px, timeout s řízenými hodinami. Nejde o produkční end-to-end odeslání.

## Návrat

Předchozí produkční deployment: `dpl_ANTHd4eZuXGSdAEW1CZZJXjRgDLp`,
`https://fiala-p5rjhn57f-jeromedefifs-projects.vercel.app`, commit `fc999cf`.
Rollback aplikace nevyžaduje změnu dat ani schématu.
