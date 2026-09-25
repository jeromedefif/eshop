# Bezpečné nasazení oprav auditu

Stav 24. 9. 2026: základní opravy jsou nasazené od 22. 9. na produkci.
Deployment `dpl_6rVJj2C6RApzewsBGFrCAnvfUMZv`, commit `c2ae409`, projekt
Vercel `fiala`, Supabase `uhawlwolmyoqcdurhuel`. Následující postup je runbook;
aktuální výsledky a zbývající omezení jsou uvedené na konci.

## Co se mění

- Next.js 16.3.5 / React 19, odpovídající SSR adaptér, Resend a SheetJS;
  build už nezamlčuje chyby TypeScriptu a ESLintu.
- Autorizace e-mailových a konfiguračních endpointů. Objednávku, její položky
  a dvě e-mailová oznámení zapisuje jediná transakce. Stejný request key nezaloží
  další objednávku. Název a kategorie produktu se ukládají i do položky objednávky.
- Koncepty objednávek patří konkrétnímu účtu, mají expiraci a používají sessionStorage.
  Košík má kontrolu revize, takže souběžný zápis z jiného zařízení neprojde potichu.
- E-mailová fronta ukládá stav, chyby a pokusy. Poskytovatel dostává stabilní
  idempotency key. Nejisté odeslání po 23 hodinách vyžaduje ruční ověření;
  automatické opakování je omezeno na osm pokusů. Stav `sent` znamená přijetí
  poskytovatelem, nikoli prokázané doručení do schránky.
- Opravené RLS/granty pro produkty, profily a objednávky. Serverová databázová
  role musí nadále mít potřebná oprávnění; nikdy se neposkytuje prohlížeči.
- Stránkování administrace objednávek, agregace statistik v SQL, společné
  produktové operace a odstranění nepoužívaných komponent.

## Ověření před schválením produkce

1. Ověřit obnovitelnou zálohu/PITR a obnovu na oddělené databázi. Neprovádět
   `db reset`, `migrate reset`, `db push --force-reset` ani destruktivní rollback.
2. Na klonu aktuální produkce porovnat schéma, počty a integritu objednávek
   a položek. Lokální testovací schéma není kopií všech Supabase Auth triggerů.
   Zvlášť ověřit registraci, vytvoření profilu auth triggerem, potvrzení e-mailu,
   reset hesla, editaci profilu a přihlášení běžného zákazníka i administrátora.
3. Ověřit verzi Node 22.13+ (doporučená podporovaná LTS), proměnné DB,
   Supabase, RESEND_API_KEY a FROM_EMAIL. Tajné klíče nepatří do logů.
4. Nastavit silný CRON_SECRET ve Vercelu a stejnou hodnotu ve Vault jako
   `beginy_email_cron_secret`. Ověřený tarif Hobby nepovoluje pětiminutový
   Vercel Cron; plánovač proto připravuje samostatný soubor
   `supabase/post-deploy/email_delivery_schedule.sql` přes Supabase pg_cron
   a pg_net. Úloha vzniká vypnutá; aktivovat ji teprve po ověření workeru.
   Bez skutečně běžícího plánovače není automatické
   zotavení fronty ověřeno. Na stagingu použít testovací příjemce/provider;
   nekopírovat produkční frontu k aktivnímu odesílači.
5. Ověřit administraci, vyhledávání, stránkování, Excel exporty, historii,
   opakování objednávky a košík na dvou zařízeních. Ověřit účet A → odhlášení
   → účet B a ztrátu odpovědi po úspěšném uložení objednávky.
6. Schválit změny a plán nasazení až s výsledky těchto kontrol.

## Pořadí nasazení

### A. Rozšíření databáze a oprava oprávnění

Po schválení aplikovat pouze
`supabase/migrations/20260921210504_security_order_delivery.sql`.
Předem porovnat historii migrací; nepouštět všechny historické soubory naslepo.
Provést v jediné transakci s ON_ERROR_STOP, krátkým lock_timeout (např. 3 s)
a omezeným statement_timeout. Při čekání na zámky transakci ukončit a termín
přehodnotit. Indexy zde nejsou CONCURRENTLY; velikost tabulek a délku zámků
je nutné změřit na produkčním klonu předem.

Migrace nemaže objednávky, položky ani profily. Historické snapshoty zůstávají
NULL a čtení používá původní produkt. Nové sloupce objednávek jsou nullable.
Starému formuláři dočasně zůstává vlastnický INSERT; jeho platná objednávka
je ověřena lokálním přechodovým SQL testem. Anonymní přístup k profilům,
cizím profilům a možnost změnit is_admin se neobnovují.

### B. Nasazení aplikace

Nasadit otestovaný build, ověřit zákaznické/admin průchody a sledovat chyby,
frontu a poskytovatele. Přechodová oprávnění umožňují otevřeným starým kartám
odeslat objednávku, ale jejich původní dvoukrokový zápis stále není atomický.
Během přechodu také starý klient košíku nekontroluje revizi. Přechod má být
krátký a řízený; uživatelé musí obnovit staré karty před závěrečným krokem.

### C. Samostatná závěrečná brána

Teprve po ověření B, vypnutí starého deploymentu a obnově starých klientů
aplikovat `supabase/post-deploy/checkout_server_only.sql`. Záměrně neleží
v automatické složce migrations. Zruší přímé zákaznické zápisy objednávek,
položek a košíků; funkční cesta už musí vést přes nové autorizované API.
Starý otevřený klient po této bráně neumí zapisovat a musí být obnoven.

### D. Starý e-mailový odesílač

Supabase Edge Function `send-order-confirmation` zůstává dostupná pod stejnou
adresou. Zabezpečení adaptérem a jeho změna odpovědi jsou popsány níže.

## Návrat při problému

Po A lze vrátit předchozí aplikaci bez mazání přidaných sloupců/tabulky.
Po C nelze prostě vrátit starý frontend: nejdřív je nutné cíleně obnovit jen
přechodové vlastnické INSERT policy/granty objednávek z A a původní vlastnické
zápisy košíků, které byly ověřeny na klonu. Neobnovovat staré neomezené granty
produktů/profilů. Preferovat opravu aplikace dopředu.

Při rollbacku nesmazat nová data ani frontu. Pozastavit její worker a zabránit,
aby starý sender znovu posílal oznámení již přijatá poskytovatelem. Před
případným opakováním porovnat provider_id a idempotency key v logu poskytovatele.
Neobnovovat plošně starou databázi přes nově přijaté objednávky.

## Lokální kontroly

- Produkční sestavení Next.js prošlo proti izolované lokální DB.
- TypeScript prošel; ESLint bez chyb, čtyři upozornění ve stávajícím kódu.
- 22 testů: validace, izolace konceptů, autorizace API, souběžný checkout,
  rollback při chybě fronty, retry bez duplicit, bezpečné ukončení retry,
  RLS, ochrana košíku před přepsáním, návrat k nezměněnému konceptu,
  SQL agregace se snapshoty a Excel s českými znaky a textem začínajícím `=`.
- Lokální katalog a přihlašovací stránka ověřeny prohlížečem bez runtime chyb.
  Katalog přitom četl veřejné produkty přes anonymní Supabase klient; nebyl
  použit přihlášený produkční účet ani odeslán formulář.
- Inicializace nového lokálního schématu a přechodový starý checkout prošly.
- npm audit po aktualizaci hlásil 0 známých zranitelností.
- Testy nepoužívají ostrou DB ani skutečné odesílání. Lokální PostgreSQL je
  verze 14; CI je připraveno pro PostgreSQL 15 stejně jako produkce. CI se
  dosud nespustilo na vzdáleném serveru.

Spuštění testů: vytvořit prázdnou lokální DB s názvem končícím `_test`, nastavit
TEST_DATABASE_URL, spustit `node scripts/setup-test-db.mjs` a `npm test`.
Skript i integrační test odmítnou jiný než lokální host a netestovací název DB.
Bez TEST_DATABASE_URL běží jen jednotkové testy; CI proměnnou nastavuje.

## Výsledky produkčního nasazení

- Uživatel výslovně schválil export zákaznických a Auth dat a izolovanou obnovu.
  Zálohy `.release-backups/20260922/before-hardening.dump` a
  `before-hardening-final.dump` mají oprávnění 600, adresář 700 a jsou mimo Git
  i Vercel upload. Obsahují public, auth, private a supabase_migrations;
  nejde o úplnou zálohu Storage/Vault/platformy.
- Obnova prvního archivu prošla v lokálním PostgreSQL 15 v Dockeru bez sítě.
  Na klonu prošla migrace, kontrola původních dat, registrační trigger,
  vlastnická oprávnění a přechodový checkout. Testovací transakce byly vráceny.
- Produkční migrace proběhla s krátkými timeouty a kontrolou otisků původních
  dat v téže transakci. Počet 823 objednávek a 5 490 položek se při nasazení
  nezměnil. Dne 24. 9. je 824 objednávek a 5 495 položek: nová skutečná
  objednávka má dvě oznámení ve stavu sent (přijetí poskytovatelem).
- Produkční historie: `20260922212344 security_order_delivery`
  odpovídá lokálnímu souboru `20260921210504_security_order_delivery.sql`;
  `20260922212548 restrict_legacy_function_access` odpovídá lokálnímu
  `20260922212511_restrict_legacy_function_access.sql`.
  `20260922212637 prepare_email_delivery_schedule` a
  `20260922212804 checkout_server_only` odpovídají ručním post-deploy souborům.
  Nepouštět celou historickou řadu přes db push: časové identifikátory se liší.
- Závěrečná brána přímých zákaznických zápisů je aktivní. Staré otevřené karty
  vyžadují obnovení. Při návratu na starou aplikaci platí omezení části Návrat.
- CRON_SECRET je nastaven v produkčním Vercelu i Supabase Vault.
  Dne 24. 9. ověřen pg_net požadavek na produkční worker: HTTP 200,
  processed=0, bez timeoutu. Job beginy-email-deliveries aktivován po této
  kontrole, interval pět minut. Prázdná fronta nevyvolá HTTP požadavek.
- Veřejný web, login a katalog po prvním nasazení HTTP 200; chráněná API
  odmítla anonymní požadavky. Prohlížeč bez runtime chyb. Nebyly vytvářeny
  testovací produkční objednávky ani odesílány testovací e-maily.

## Dokončení zabezpečení starého odesílače

Připravený kompatibilní adaptér zachovává URL send-order-confirmation a
předává požadavek na stejné API jako aplikace. API ověřuje bearer token přes
Supabase Auth a v databázi kontroluje vlastníka nebo administrátora.
Neplatný bearer token se nikdy nenahradí identitou z cookies.
Adaptér nepoužívá service-role ani Resend klíč, neposílá přímo a nemění stav
objednávky. Úspěch vrací HTTP 202 a queued=true, nikoliv tvrzení o doručení.
Nasazovat nejprve aplikaci s podporou bearer tokenu, až poté Edge adaptér.
Tři nové regresní testy ověřují bearer autorizaci; 16 jednotkových/API testů
prošlo, 9 DB testů v tomto běhu záměrně přeskočeno bez TEST_DATABASE_URL.
Dřívější úplná sada 22 testů v izolované DB prošla.

## Zbývající omezení

- [Aktualizace Supabase PostgreSQL](https://supabase.com/docs/guides/platform/upgrading)
  vyžaduje vlastní servisní okno a ověření obnovy; v této změně se neprovádí.
- [Ochrana před uniklými hesly](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
  je vypnutá; je třeba ověřit dostupnost na tarifu před případnou aktivací.
- Pět informačních hlášení RLS bez policy je záměrných pro serverové tabulky;
  klienti k nim nemají přímý přístup.
  [Význam hlášení](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- E-mailové přijetí poskytovatelem není důkaz doručení do schránky.
- Přihlášené zákaznické/admin UI a reset hesla nebyly plošně proklikané
  skutečnými účty. Produkční objednávka ověřuje reálný checkout, nikoliv všechny
  možné průchody. Historická data ani stará oznámení se zpětně nepřepisují.

## Uzavření nasazení 24. 9. 2026

- Vercel `dpl_5QZVRs7KjBcYzJT5Vmm9au3aj1Lg`, commit `a528df4`, sestaven
  bez přepnutí domény, ověřen a následně úspěšně povýšen na produkci.
- Úplná lokální sada s izolovanou DB: **25/25 testů prošlo**. Vercel build,
  TypeScript a lint bez chyb (čtyři dřívější upozornění).
- Edge Function `send-order-confirmation` nasazena jako **verze 25**, JWT
  kontrola zůstala zapnutá. Adaptér otestován pro preflight, odmítnutí anonymního
  požadavku, předání autorizace a selhání upstreamu. Původní zdroj je v historii Git.
- Plánovač je aktivní; první automatický běh 24. 9. 09:15 UTC skončil succeeded.
- Záloha před migrací má doplněný SHA-256 kontrolní součet.

## Aktualizace databáze 25. 9. 2026

Uživatel schválil aktualizaci PostgreSQL po upozornění na odstávku až jednu
hodinu a nemožnost downgradu. Výslovně nepožadoval novou zálohu; nebyla
vytvořena. Starší ověřený archiv obsahuje 823 objednávek a není aktuální.

Před upgradem bylo po kontrole zdrojů aplikace, nasazené Edge Function,
databázových závislostí a textů funkcí/pohledů/cron úloh odstraněno nepoužívané
rozšíření pgjwt pomocí DROP EXTENSION RESTRICT. Migrace 20260924193610.
Sledování volání funkcí bylo vypnuté, takže kontrola nevylučuje neznámého
externího volajícího.

Upgrade na verzi 17.6.1.166 (bez označení Preview) zahájen 25. 9. 07:27:33 UTC.
Tracking ID: 32ea1570-f9d3-4b89-97c1-603478ce2382.
Před upgradem: 826 objednávek, 5 505 položek, 31 profilů, 158 produktů,
32 Auth uživatelů, žádná čekající e-mailová oznámení.
Otisk objednávek: 143863793cd7f70d2e98cf12e998b4f3.
Otisk položek: a069bd4cef199a1a2274b0139e5054af.
Cron beginy-email-deliveries aktivní každých pět minut.

Výsledek ověřen 25. 9. přibližně v 17:27 UTC: projekt ACTIVE_HEALTHY,
PostgreSQL 17.6.1.166, release channel ga. Bezpečnostní advisor již nehlásí
zastaralou verzi PostgreSQL. Zůstává vypnutá placená ochrana uniklých hesel
(a informační RLS hlášení serverových tabulek).

Všech 826 původních objednávek a 5 505 původních položek je přítomno.
Otisk původních položek přesně souhlasí s hodnotou před upgradem.
Otisk objednávek není totožný; dvě původní objednávky mají aktualizaci stavu
confirmed v 07:58 a 07:59 UTC. Bez per-row snapshotu před upgradem nelze
prokázat shodu všech ostatních sloupců objednávek. Nová objednávka vznikla
ve 14:46 UTC, dvě její oznámení mají stav sent. Aktuálně 827 objednávek,
5 507 položek, 158 produktů. Auth audit eviduje user_deleted v 12:25:39 UTC;
počty Auth/profilů klesly na 31/30. Tato kontrola sama neurčuje původce smazání.

Cron beginy-email-deliveries je nadále aktivní každých pět minut, poslední
ověřené běhy 17:15, 17:20 a 17:25 UTC succeeded. Fronta bez čekajících zpráv.
Přímý zákaznický INSERT objednávek a čtení Vault zůstávají zakázané.
HTTP kontroly: web, login, veřejný katalog 200; chráněná API odmítají
anonymní volání; autorizovaný e-mailový worker 200 a processed=0.
Nebyla vytvořena testovací objednávka, nový účet ani odeslán testovací e-mail.
Přihlášená existující relace načetla katalog i administraci objednávek;
objednávky se zobrazily, bez chyb konzole. Vercel production log za posledních
15 minut při závěrečné kontrole neobsahoval error/fatal záznamy.
