# Rychlé objednání – lokální úprava

Lokální návrh pro schválení, bez nasazení a bez databázové migrace.

- V katalogu po zapnutí „Jen v košíku“ je pod seznamem panel s litry, PET baleními a plyny, včetně nulových hodnot.
- „Rychle objednat“ otevře přístupný potvrzovací dialog. Na mobilu je navíc pevné spodní tlačítko.
- Dialog načte aktuální dodací údaje přes stávající GET /api/checkout a zachová poznámku z košíku. Objednávka se odešle až po výslovném „Objednat“.
- Stejná příprava konceptu a přenos objednávky se používají i v běžném průchodu košíkem. Serverové kontroly, atomické vytvoření, e-maily a synchronizace košíku se nemění.
- Neověřený předchozí pokus se nepřepisuje. Zákazník je odkázán na ověření původního odeslání se stejným klíčem.
- Po úspěchu se uloží potvrzení, odeberou pouze nezměněné odeslané řádky a otevře standardní stránka přijaté objednávky.
- Pokud se potvrzení nepodaří uložit v prohlížeči, dialog ukáže přijetí a odkaz na historii, bez dalšího odeslání.

## Ověření

TypeScript a cílený ESLint prošly. Automatické testy: 42 úspěšných, 10 databázových integračních testů přeskočeno. Nové testy simulují odpovědi API; žádná skutečná objednávka nebyla vytvořena.

V místním prohlížeči ověřen seznam vybraných produktů, součty, načtení dodacího místa, výchozí fokus na zrušení, návrat k seznamu a mobilní šířky 390 a 320 px bez přetékání dialogu. Finální POST v prohlížeči nebyl spuštěn: lokální aplikace používá skutečný objednávkový endpoint a ruční potvrzení může vytvořit ostrou objednávku.

Ruční náhled: http://localhost:3000/?kosik=1
