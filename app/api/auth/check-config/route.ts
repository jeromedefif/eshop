import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET() {
  try {
    // Kontrola konfigurace pro Supabase a další služby
    const configuration = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? true : false,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? true : false,
      resendApiKey: process.env.RESEND_API_KEY ? true : false,
      fromEmail: process.env.FROM_EMAIL ? true : false,
      redirectUrls: {
        origin: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        login: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`,
        resetPassword: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
        verified: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login?verified=true`
      }
    };

    return NextResponse.json(configuration);
  } catch (error) {
    console.error('Unexpected error in check config API:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
