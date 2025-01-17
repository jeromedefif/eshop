import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('Initializing Supabase client');
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
)
