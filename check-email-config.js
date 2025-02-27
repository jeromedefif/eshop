// Vytvořte nový soubor check-email-config.js v kořenovém adresáři projektu

/**
 * Tento skript kontroluje, zda jsou správně nastaveny proměnné prostředí pro odesílání emailů
 * Spusťte ho pomocí: node check-email-config.js
 */

// Kontrola Supabase URL a klíče
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL;

console.log('Kontrola konfigurace emailů:');
console.log('---------------------------');
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Nastaveno' : '❌ Chybí');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Nastaveno' : '❌ Chybí');
console.log('RESEND_API_KEY:', resendApiKey ? '✅ Nastaveno' : '❌ Chybí');
console.log('FROM_EMAIL:', fromEmail ? '✅ Nastaveno' : '❌ Chybí');

// Další kroky pro uživatele
console.log('\nPro správné fungování registračních emailů:');
console.log('1. Zkontrolujte nastavení SMTP serveru v Supabase konzoli');
console.log('2. Ujistěte se, že URL pro potvrzení emailu je nastaveno správně');
console.log('3. Ověřte, že domény odesílatele jsou verifikovány');

console.log('\nSupabase URL pro kontrolu nastavení:');
console.log(`${supabaseUrl || '[SUPABASE_URL]'}/project/[PROJECT_ID]/auth/providers`);
