# Uvítací e-mail

Nasazeno a aktivováno 12. 10. 2026. Produkční commit ce37638; chráněný worker při prázdné frontě odpověděl HTTP 200, processed: 0. Doručení do skutečné schránky nebylo testováno.

- Nové účty od okamžiku aktivace; jen potvrzené e-mailové adresy.
- Samostatný plán každých 5 minut. Bez závislosti na přítomnosti objednávek ve frontě.
- Unikátní záznam na uživatele, atomické převzetí práce, Resend idempotency key.
- Nejvýše 8 pokusů; po 23 hodinách od prvního pokusu ruční kontrola namísto rizika duplicity.
- Odpovědi zákazníků směřují na fiala@vinaria.cz.
- HTML a textová varianta; náhled docs/previews/welcome-email.html.

## Nasazení po schválení náhledu
1. Ověřit tým, projekt a databázi; aplikovat migraci welcome_email_delivery. Nové tabulky mají RLS a nejsou přístupné zákazníkům. Existující data se nemění.
2. Nasadit aplikaci. Ověřit přístup serverové DB role k novým tabulkám a existenci Vault secret beginy_email_cron_secret (hodnotu nezveřejňovat).
3. Aplikovat supabase/post-deploy/welcome_email_schedule.sql. Úloha vznikne vypnutá.
4. Po souhlasu s aktivací provést závěrečný transakční blok uvedený v SQL. Zachovat enabled_at při dalších nasazeních.
5. Sledovat public.welcome_email_deliveries: sent znamená přijetí poskytovatelem, nikoliv potvrzení doručení do schránky. failed čeká na další pokus; review vyžaduje porovnání s Resend před jakýmkoliv dalším odesláním.

Pozastavení: vypnout pouze cron úlohu beginy-welcome-emails. Tabulky ani datum aktivace nemazat.
