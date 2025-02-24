export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Session exchange error:", error);
      }

      if (data?.user) {
        // Získáme metadata z uživatele
        const metadata = data.user.user_metadata;

        // Použijeme UPSERT místo INSERT
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            full_name: metadata?.full_name,
            company: metadata?.company,
            phone: metadata?.phone,
            address: metadata?.address,
            city: metadata?.city,
            postal_code: metadata?.postal_code,
            is_admin: metadata?.is_admin || false
          }, {
            onConflict: 'id',  // V případě konfliktu podle id
            ignoreDuplicates: false  // Aktualizovat existující záznamy
          });

        if (upsertError) {
          console.error("Profile upsert error:", upsertError);
        }
      }
    } catch (e) {
      console.error("Unexpected error in callback:", e);
    }
  }

  return NextResponse.redirect(requestUrl.origin)
}
