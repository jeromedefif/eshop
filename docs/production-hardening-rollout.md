# Bezpečné nasazení oprav auditu

Stav 22. 9. 2026: změny jsou pouze lokální. Nebyl proveden push, deployment,
produkční migrace ani testovací objednávka či e-mail na produkci. Tento dokument
není souhlas se spuštěním produkčních příkazů.

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

Supabase Edge Function `send-order-confirmation` je stále aktivní a její
zdroj zůstává zachovaný. Před vyřazením ověřit provozní logy, webhooky a jiné
volající. Pouhá absence volání v tomto repozitáři nedokazuje, že není používána.
Její případné vyřazení nebo zabezpečení je samostatný krok s regresním testem.

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

## Zbývající rizika

Produkční oprávnění zjištěná auditem se samotnou lokální úpravou neopravila.
Nasazení nesmí být označeno za hotové bez aplikace migrací a ověření provozu.
Staging Auth/email průchody, obnova zálohy, plánovač a stará Edge Function
zůstávají vstupními podmínkami produkčního nasazení. Tyto změny neprovádějí
historickou opravu případných neúplných objednávek ani zpětné rozesílání e-mailů.

## Zahájení produkční přípravy 22. 9. 2026

Uživatel schválil řízené nasazení během provozní pauzy. Read-only kontrola
v 11:19 UTC: 823 objednávek, 5 490 položek, 31 profilů, 158 produktů,
žádná nová objednávka za 30 minut. Poslední objednávka 21. 9. 2026 19:16 UTC.
Produkční projekt Vercel je `fiala` (`prj_i9OpLBQ1lPWjguzMwc2Wuh7ZUJOj`),
domény `beginy.cz` a `www.beginy.cz`. Dosavadní ověřený rollback kandidát:
`dpl_G6SBbCt9Kv2Rty6VJmbXE5VjzBKs`, commit `cac1e34c2b4d1fba4b71a5cb0de81600b392529d`.

Před samotnou změnou zatím zbývá přihlášení CLI ke správnému Vercel účtu
(a následná kontrola plánu/proměnných) a výslovný souhlas s lokální zálohou
včetně Auth, který si vyžádala automatická bezpečnostní kontrola. Do té doby
není povoleno zahájit export ani produkční migraci. Toto je aktuální záznam
přípravy, nikoli potvrzení nasazení.

Propojení CLI bylo dokončeno a ověřeno: účet `jeromedefif`, tým
`jeromedefifs-projects`, projekt `fiala`. Produkce používá Node 22.x a tarif
Hobby. Původní pětiminutový Vercel Cron byl z lokální konfigurace odstraněn,
protože by na tomto tarifu zablokoval deployment. Připravený Supabase job
zatím nebyl aplikován ani aktivován. CRON_SECRET zatím v projektu není.
