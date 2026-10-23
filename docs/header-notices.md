# Proužek nad hlavičkou

Správa: Administrace → Oznámení → Proužek nad hlavičkou. Nastavení je oddělené od zákaznických oznámení nad katalogem.

- Nejvýše 3 krátké zprávy (180 znaků), pořadí, zapnutí a volitelná platnost od/do.
- Datum editoru odpovídá časovému pásmu prohlížeče; API ukládá čas v UTC s explicitním pásmem.
- Zprávy se střídají každých 10 sekund jemným prolnutím. Ovládání obsahuje pozastavení a ruční přepnutí. Při interakci, skrytém panelu a omezeném pohybu se automatické střídání zastaví.
- Všechny aktivní texty sdílejí výšku nejvyššího z nich, aby při změně neposkakovala hlavička. Prázdné zprávy skryjí zprávový prostor; kontakt na desktopu zůstává.
- Bez HTML; `**text**` je pouze bezpečné zvýraznění přes React. Veřejné API vrací pouze právě aktivní zprávy, žádné budoucí koncepty nebo administrátorskou revizi.
- Nastavení se načítá při otevření, návratu na panel a nejpozději každou minutu. Interval rotace neprovádí databázový dotaz. Při chybě prvního načtení se použije výchozí informace.
- Admin GET/PUT používá existující `requireAdmin()`. Zápis vyžaduje aktuální UUID revizi a atomicky odmítne změny založené na starší verzi (409).

## Místní režim

Při `NODE_ENV=development` nové API čte a zapisuje výhradně `.cache/header-notices.json` (ignorované Gitem), nikoli databázi. Autentizace správce a původní upozornění nad katalogem stále používají stávající backend; nezasahujte do nich při zkoušení proužku.

Místní soubor je nezávislý na produkci. Zde připravené ukázkové texty se automaticky nepřenášejí na produkci.

## Před produkčním nasazením

Uživatel nejdříve schválí místní náhled. Migrace `supabase/migrations/20261023124225_header_notice_settings.sql` byla na výslovný pokyn k nasazení aplikovaná 23. 10. 2026 v produkčním projektu `obchod` (`uhawlwolmyoqcdurhuel`). Přidává jednu samostatnou tabulku a výchozí zprávu, nemění stávající tabulky ani košíky. RLS zapnuto, žádný přímý přístup anon/authenticated. Serverové DB připojení musí používat stávající důvěryhodnou roli s oprávněním čtení a aktualizace; po migraci ověřit účinné granty a RLS.

Byla aplikovaná pouze tato migrace; účinné granty, RLS a čtení přes Prisma byly ověřeny. Anon/authenticated nemají SELECT ani UPDATE; service_role má SELECT/UPDATE a nemá DELETE. RLS bez politik je záměrný zákaz přímého klientského přístupu. Bez tabulky veřejné API bezpečně zachová výchozí text a admin nastavení hlásí nedostupnost. Návrat aplikace ke starší verzi může tabulku ponechat bez zásahu.
