import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Nastaveno' : 'Chybí',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Nastaveno' : 'Chybí',
    resendApiKey: process.env.RESEND_API_KEY ? 'Nastaveno' : 'Chybí',
    fromEmail: process.env.FROM_EMAIL ? 'Nastaveno' : 'Chybí',
  });
}
