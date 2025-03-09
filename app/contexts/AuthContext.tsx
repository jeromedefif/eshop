// app/contexts/AuthContext.tsx
'use client'
let lastSignOutEventTime = 0;
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { AuthContextType, UserProfile, SignUpData, UpdateProfileData } from '@/types/auth'
import { toast } from 'react-toastify'
import debounce from 'lodash/debounce';

// Cache profilu - udržuje poslední známý stav profilu
// Toto pomáhá zabránit zbytečným API dotazům
let profileCache: Record<string, { data: UserProfile | null, timestamp: number }> = {};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Pomocná funkce pro vyčištění localStorage a cookies
const cleanupAuthStorage = () => {
  // Vyčistíme localStorage
  try {
    const authKeys = ['supabase.auth.token', 'supabase.auth.refreshToken'];
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') || authKeys.includes(key) || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.warn('Error cleaning localStorage:', e);
  }

  // Vyčistíme cookies
  try {
    document.cookie.split(';').forEach(c => {
      const cookieName = c.trim().split('=')[0];
      if (cookieName.includes('sb-') || cookieName.includes('supabase')) {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
  } catch (e) {
    console.warn('Error cleaning cookies:', e);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Referenční proměnná pro sledování stavu probíhající operace
  const inProgressRef = useRef<boolean>(false);
  // Referenční proměnná pro sledování poslední kontroly session
  const lastSessionCheckRef = useRef<number>(Date.now());
  // Počítadlo autentizačních operací pro zabránění souběžným operacím
  const authOperationCounterRef = useRef<number>(0);
  // Čítač profil fetchů - sleduje kolikrát byl profil načten
  const profileFetchCounterRef = useRef<number>(0);

  // KLÍČOVÁ OPTIMALIZACE: Optimalizovaná funkce pro získání profilu
  // Tato funkce využívá cache pro zamezení zbytečným dotazům
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!userId) return null;

    profileFetchCounterRef.current += 1;
    const currentFetchId = profileFetchCounterRef.current;

    // Kontrola cache - použijeme cache pokud je mladší než 60 sekund
    const cacheEntry = profileCache[userId];
    const now = Date.now();
    const cacheTimeout = 60000; // 60 sekund

    if (cacheEntry && (now - cacheEntry.timestamp < cacheTimeout)) {
      console.log('[Auth] Using cached profile for', userId);
      return cacheEntry.data;
    }

    try {
      console.log('[Auth] Fetching profile for', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Zrušení operace, pokud začala nová
      if (currentFetchId !== profileFetchCounterRef.current) {
        console.log('[Auth] Profile fetch aborted - newer operation started');
        return null;
      }

      if (error) {
        console.error('[Auth] Profile fetch error:', error.message);
        return null;
      }

      // Aktualizace cache
      profileCache[userId] = {
        data,
        timestamp: now
      };

      lastSessionCheckRef.current = now;
      return data;
    } catch (error) {
      console.error('[Auth] Error fetching profile:', error);
      return null;
    }
  }, []);

  // Bezpečné resetování stavu autentizace
  const resetAuthState = useCallback(async () => {
    // Zabránit vícenásobným reset operacím - pokud již operace probíhá, vrátíme se
    if (inProgressRef.current) return;
    inProgressRef.current = true;

    try {
      // Nejprve nastavíme lokální stav
      setUser(null);
      setProfile(null);
      setIsAdmin(false);

      // Vyčistíme cache
      profileCache = {};

      // Vyčistíme úložiště pomocí naší pomocné funkce
      cleanupAuthStorage();

      // Explicitní odhlášení ze Supabase - toto musí proběhnout jako poslední
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (e) {
        console.warn('[Auth] Error during Supabase signOut:', e);
      }
    } catch (error) {
      console.error('[Auth] Error during auth state reset:', error);
    } finally {
      inProgressRef.current = false;
    }
  }, []);

  // KLÍČOVÁ OPTIMALIZACE: Vylepšená kontrola platnosti session
  // Zabráníme zbytečným kontrolám a použijeme stavové proměnné pro sledování session
  const checkSession = useCallback(async (force = false) => {
    // Pokud již nějaká operace probíhá, nevykonáváme další kontrolu
    if (inProgressRef.current) {
      console.log('[Auth] Session check skipped - operation in progress');
      return;
    }

    // Rychlé ověření, zda je potřeba provést kontrolu
    if (!force) {
      const now = Date.now();
      const minInterval = 60000; // 60 sekund mezi kontrolami

      if (now - lastSessionCheckRef.current < minInterval) {
        console.log('[Auth] Session check skipped - too soon');
        return;
      }
    }

    inProgressRef.current = true;
    authOperationCounterRef.current += 1;
    const currentOperationId = authOperationCounterRef.current;
    console.log('[Auth] Checking session', currentOperationId);

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      // Pokud jiná operace dokončila mezitím, ukončíme tuto
      if (currentOperationId !== authOperationCounterRef.current) {
        console.log('[Auth] Session check aborted - newer operation started');
        return;
      }

      if (error) {
        console.warn('[Auth] Session check failed:', error.message);
        await resetAuthState();
        return;
      }

      if (!session) {
        if (user !== null) {
          console.log('[Auth] Session expired, resetting state');
          await resetAuthState();
        }
        return;
      }

      // Pokud existuje session, ale nemáme uživatele, načteme profil
      if (!user && session.user) {
        // Použijeme profil cache pokud existuje
        const existingCacheEntry = profileCache[session.user.id];
        if (existingCacheEntry) {
          console.log('[Auth] Using cached profile during session check');
          setUser(session.user);
          setProfile(existingCacheEntry.data);
          setIsAdmin(existingCacheEntry.data?.is_admin || false);
        } else {
          const profileData = await fetchProfile(session.user.id);

          // Další kontrola, zda jiná operace mezitím nedokončila
          if (currentOperationId !== authOperationCounterRef.current) {
            console.log('[Auth] Profile fetch during session check aborted');
            return;
          }

          if (profileData) {
            setUser(session.user);
            setProfile(profileData);
            setIsAdmin(profileData.is_admin);
          } else {
            console.warn('[Auth] Profile not found for session user');
            await resetAuthState();
          }
        }
      }

      lastSessionCheckRef.current = Date.now();
    } catch (err) {
      console.error('[Auth] Error checking session:', err);
    } finally {
      inProgressRef.current = false;
    }
  }, [user, fetchProfile, resetAuthState]);

  // Inicializace autentizace - pouze jednou při načtení stránky
  useEffect(() => {
    let mounted = true;
    let authSubscription: { data: { subscription: any } } | null = null;
    console.log('[Auth] Initializing auth system');

    const setupAuth = async () => {
      setIsLoading(true);

      try {
        // Získání aktuální session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] Initial session error:', error.message);
          await resetAuthState();
          return;
        }

        if (mounted) {
          if (data.session?.user) {
            // Načteme profil pouze jednou při prvním načtení
            const profileData = await fetchProfile(data.session.user.id);

            if (profileData) {
              setUser(data.session.user);
              setProfile(profileData);
              setIsAdmin(profileData.is_admin);
            } else {
              await resetAuthState();
            }
          }

          // Nastavení event listener pro autentizační změny
          const authListener = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log('[Auth] Auth state changed:', event);

              if (event === 'SIGNED_OUT') {
                const now = Date.now();
                if (now - lastSignOutEventTime < 1500) {
                console.log('[Auth] Ignoring rapid consecutive SIGNED_OUT event to prevent loop');
               return;
               }
               lastSignOutEventTime = now;

                 // Pokračujeme s normálním zpracováním
                 await resetAuthState();
                 return;
               }


              if (session?.user) {
                // Pokusíme se použít cache při změně stavu autentizace
                const cacheEntry = profileCache[session.user.id];
                if (cacheEntry) {
                  setUser(session.user);
                  setProfile(cacheEntry.data);
                  setIsAdmin(cacheEntry.data?.is_admin || false);
                } else {
                  const profileData = await fetchProfile(session.user.id);

                  if (profileData) {
                    setUser(session.user);
                    setProfile(profileData);
                    setIsAdmin(profileData.is_admin);
                  } else {
                    await resetAuthState();
                  }
                }
              }
            }
          );

          authSubscription = authListener;
        }
      } catch (error) {
        console.error('[Auth] Auth initialization error:', error);
        await resetAuthState();
      } finally {
        // Vždy označíme inicializaci jako dokončenou
        if (mounted) {
          setIsInitialized(true);
          setIsLoading(false);
        }
      }
    };

    setupAuth();

    // DŮLEŽITÁ ZMĚNA: Nastavíme pouze periodickou kontrolu, žádné kontroly při aktivitě uživatele
    const intervalId = setInterval(() => {
      checkSession(false);
    }, 5 * 60 * 1000); // 5 minut

    console.log('[Auth] Setup complete');

    return () => {
      console.log('[Auth] Cleaning up auth system');
      mounted = false;

      // Odstranění event listeneru
      if (authSubscription) {
        authSubscription.data.subscription.unsubscribe();
      }

      // Vyčištění intervalu
      clearInterval(intervalId);
    };
  }, []); // Prázdný dependency array - spuštění pouze jednou

  // Optimalizovaná implementace přihlášení
  const signIn = async (email: string, password: string) => {
    if (inProgressRef.current) {
      toast.info('Přihlašování již probíhá, čekejte prosím...');
      return;
    }

    inProgressRef.current = true;
    authOperationCounterRef.current += 1;
    const currentOperationId = authOperationCounterRef.current;

    setIsLoading(true);

    try {
      // Před přihlášením se ujistíme, že uživatel je skutečně odhlášen
      await resetAuthState();

      // Kontrola, zda nebyla operace zrušena
      if (currentOperationId !== authOperationCounterRef.current) return;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Kontrola, zda nebyla operace zrušena během sigIn
      if (currentOperationId !== authOperationCounterRef.current) return;

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Nesprávné přihlašovací údaje');
          throw new Error('Nesprávné přihlašovací údaje');
        }
        toast.error(`Chyba přihlášení: ${error.message}`);
        throw error;
      }

      if (!data.user) {
        toast.error('Přihlášení se nezdařilo');
        throw new Error('Přihlášení se nezdařilo');
      }

      const profileData = await fetchProfile(data.user.id);

      // Finální kontrola před nastavením uživatele
      if (currentOperationId !== authOperationCounterRef.current) return;

      if (!profileData) {
        toast.error('Nepodařilo se načíst profil uživatele');
        throw new Error('Nepodařilo se načíst profil uživatele');
      }

      setUser(data.user);
      setProfile(profileData);
      setIsAdmin(profileData.is_admin);
      toast.success('Přihlášení úspěšné');

      // Aktualizace časovače poslední kontroly
      lastSessionCheckRef.current = Date.now();
    } catch (error) {
      console.error('[Auth] Error in signIn:', error);
      await resetAuthState();
      throw error;
    } finally {
      setIsLoading(false);
      inProgressRef.current = false;
    }
  };

  const forgotPassword = async (email: string) => {
    if (inProgressRef.current) {
      toast.info('Operace již probíhá, čekejte prosím...');
      return;
    }

    inProgressRef.current = true;
    setIsLoading(true);

    try {
      console.log('[Auth] Odesílám email pro reset hesla na:', email);

      // Správná URL pro přesměrování - přímá cesta na /reset-password
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.beginy.cz';
      const redirectURL = `${baseUrl}/reset-password`;

      console.log('[Auth] Redirect URL:', redirectURL);

      // Odeslání emailu pro reset hesla
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectURL
      });

      if (error) {
        console.error('[Auth] Chyba při odesílání emailu pro reset hesla:', error);

        if (error.message.includes('rate limit')) {
          toast.error('Příliš mnoho pokusů. Zkuste to prosím později.');
        } else {
          // Neprozrazujeme, zda email existuje
          toast.success('Pokud email existuje v databázi, byl odeslán odkaz pro reset hesla');
        }
      } else {
        toast.success('Na váš email byl odeslán odkaz pro reset hesla');
      }
    } catch (error) {
      console.error('[Auth] Neočekávaná chyba v forgotPassword:', error);
      toast.success('Pokud email existuje v databázi, byl odeslán odkaz pro reset hesla');
    } finally {
      setIsLoading(false);
      inProgressRef.current = false;
    }
  };

  // DŮLEŽITÉ: Tuto funkci resetPassword už nebudeme používat z AuthContext
  // Místo toho použijeme přímé volání Supabase API na stránce reset-password

  // Funkce zůstává v AuthContext pouze pro zpětnou kompatibilitu
  const resetPassword = async (newPassword: string) => {
    if (!newPassword) {
      throw new Error('Heslo nemůže být prázdné');
    }

    if (newPassword.length < 6) {
      throw new Error('Heslo musí mít alespoň 6 znaků');
    }

    if (inProgressRef.current) {
      toast.info('Operace již probíhá, čekejte prosím...');
      return;
    }

    inProgressRef.current = true;
    setIsLoading(true);

    try {
      console.log('[Auth] UPOZORNĚNÍ: Používáte resetPassword z AuthContext - tato funkce by neměla být používána');
      console.log('[Auth] Použijte místo toho přímé volání updateUser na stránce reset hesla');

      // Tato funkce už není používána - veškerá logika je nyní přímo na stránce reset-password
      throw new Error('Tato funkce je zastaralá. Použijte přímé volání Supabase API.');
    } catch (error) {
      console.error('[Auth] Chyba v resetPassword:', error);
      toast.error(error instanceof Error ? error.message : 'Chyba při resetování hesla');
      throw error;
    } finally {
      setIsLoading(false);
      inProgressRef.current = false;
    }
  };


  // KLÍČOVÁ OPTIMALIZACE: Zjednodušená implementace refreshProfile
  // Tato implementace používá cache a předchází zbytečným dotazům na server
  const refreshProfile = async () => {
    // Pokud nemáme uživatele, nemůžeme obnovit profil
    if (!user) return null;

    // Pokud už běží nějaká operace, vracíme null
    if (inProgressRef.current) {
      console.log('[Auth] Profile refresh skipped - operation in progress');
      return null;
    }

    // Ověření, zda je potřeba obnovit profil - kontrola cache
    const cacheEntry = profileCache[user.id];
    const now = Date.now();
    const cacheTimeout = 30000; // 30 sekund

    if (cacheEntry && (now - cacheEntry.timestamp < cacheTimeout)) {
      console.log('[Auth] Using cached profile for refresh');
      return cacheEntry.data;
    }

    inProgressRef.current = true;
    try {
      console.log('[Auth] Refreshing profile');
      const profileData = await fetchProfile(user.id);

      if (profileData) {
        // Aktualizace stavu pouze pokud se profil změnil
        if (JSON.stringify(profileData) !== JSON.stringify(profile)) {
          setProfile(profileData);
        }
        return profileData;
      } else {
        console.warn('[Auth] Failed to refresh profile - data not found');
        return null;
      }
    } catch (error) {
      console.error('[Auth] Error refreshing profile:', error);
      return null;
    } finally {
      inProgressRef.current = false;
    }
  };

  // Ostatní metody zůstávají převážně stejné

  const signUp = async (data: SignUpData) => {
    // Implementace zůstává stejná
    if (inProgressRef.current) {
      toast.info('Registrace již probíhá, čekejte prosím...');
      return;
    }

    inProgressRef.current = true;
    authOperationCounterRef.current += 1;
    const currentOperationId = authOperationCounterRef.current;

    setIsLoading(true);

    try {
      const { email, password, metadata } = data;
      const normalizedEmail = email.toLowerCase().trim();

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: metadata.full_name,
            company: metadata.company,
            phone: metadata.phone,
            address: metadata.address,
            city: metadata.city,
            postal_code: metadata.postal_code,
            is_admin: false
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      // Kontrola, zda nebyla operace zrušena během signUp
      if (currentOperationId !== authOperationCounterRef.current) return;

      if (signUpError) {
        toast.error(`Chyba registrace: ${signUpError.message}`);
        throw signUpError;
      }

      if (!authData?.user) {
        toast.error('Registrace se nezdařila');
        throw new Error('Registrace se nezdařila');
      }

      // Zobradit potvrzovací zprávu
      toast.success('Registrace úspěšná! Zkontrolujte svůj email pro potvrzení účtu.');

      return {
        success: true,
        message: 'Registrace proběhla úspěšně. Zkontrolujte prosím svůj email pro potvrzení účtu.'
      };

    } catch (error) {
      console.error('[Auth] Chyba při registraci:', error);

      if (error instanceof Error) {
        if (error.message.includes('unique constraint')) {
          toast.error('Uživatel s tímto emailem již existuje');
          throw new Error('Uživatel s tímto emailem již existuje');
        }
        throw error;
      }
      throw new Error('Neočekávaná chyba při registraci');
    } finally {
      setIsLoading(false);
      inProgressRef.current = false;
    }
  };

  const signOut = async () => {
    if (inProgressRef.current) {
      toast.info('Odhlašování již probíhá, čekejte prosím...');
      return;
    }

    inProgressRef.current = true;
    authOperationCounterRef.current += 1;
    const currentOperationId = authOperationCounterRef.current;

    setIsLoading(true);

    try {
      toast.info('Odhlašování...');

      // Lokální reset stavů před serverovým odhlášením
      setUser(null);
      setProfile(null);
      setIsAdmin(false);

      // Vyčistíme cache
      profileCache = {};

      // Vyčistíme úložiště
      cleanupAuthStorage();

      // Serverové odhlášení - s globálním scope pro odhlášení na všech zařízeních
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (signOutError) {
        console.warn('[Auth] Error during sign out:', signOutError);
        // I při chybě pokračujeme dále
      }

      // Závěrečné vyčištění localStorage a cookies pro jistotu
      cleanupAuthStorage();

      // Kontrola zrušení operace
      if (currentOperationId !== authOperationCounterRef.current) return;

      toast.success('Odhlášení bylo úspěšné');

      // Hard reload stránky po 500ms - zajistí úplné odstranění stavů
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error) {
      console.error('[Auth] Error in signOut:', error);
      // I při chybě resetujeme a přesměrujeme
      cleanupAuthStorage();
      window.location.href = '/';
    } finally {
      setIsLoading(false);
      inProgressRef.current = false;
    }
  };

  const updateProfile = async (data: UpdateProfileData) => {
    if (!user) {
      throw new Error('Uživatel není přihlášen');
    }

    if (inProgressRef.current) {
      toast.info('Aktualizace profilu již probíhá, čekejte prosím...');
      return;
    }

    inProgressRef.current = true;
    authOperationCounterRef.current += 1;
    const currentOperationId = authOperationCounterRef.current;

    setIsLoading(true);

    try {
      console.log('[Auth] Updating profile');
      const { error } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      // Kontrola zrušení operace
      if (currentOperationId !== authOperationCounterRef.current) return;

      if (error) throw error;

      // KLÍČOVÁ OPTIMALIZACE: Místo fetchProfile použijeme přímou aktualizaci profilu
      // Tím zabráníme zbytečným API voláním
      if (profile) {
        const updatedProfile = {
          ...profile,
          ...data,
          updated_at: new Date().toISOString()
        };

        // Aktualizace cache
        profileCache[user.id] = {
          data: updatedProfile,
          timestamp: Date.now()
        };

        // Aktualizace stavu
        setProfile(updatedProfile);
      } else {
        // Fallback když nemáme stávající profil
        const updatedProfile = await fetchProfile(user.id);
        if (!updatedProfile) {
          throw new Error('Nepodařilo se načíst aktualizovaný profil');
        }
        setProfile(updatedProfile);
      }

      toast.success('Profil byl úspěšně aktualizován');
    } catch (error) {
      console.error('[Auth] Error updating profile:', error);
      toast.error('Chyba při aktualizaci profilu');

      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Chyba při aktualizaci profilu');
    } finally {
      setIsLoading(false);
      inProgressRef.current = false;
    }
  };

  // Zajistíme korektní inicializaci
  if (!isInitialized) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4 inline-block"></div>
          <p className="text-gray-900">Načítání aplikace...</p>
        </div>
      </div>
    );
  }

  const value = {
    user,
    profile,
    isLoading,
    isInitialized,
    isAdmin,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
    forgotPassword,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
