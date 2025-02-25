// app/contexts/AuthContext.tsx
'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { AuthContextType, UserProfile, SignUpData, UpdateProfileData } from '@/types/auth'
import { toast } from 'react-toastify'
import debounce from 'lodash/debounce';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
   const [user, setUser] = useState<User | null>(null);
   const [profile, setProfile] = useState<UserProfile | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [isInitialized, setIsInitialized] = useState(false);
   const [isAdmin, setIsAdmin] = useState(false);

   // Referenční proměnná pro sledování stavu probíhající operace
   const inProgressRef = useRef<boolean>(false);
   // Časovač pro sledování last-activity
   const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
   // Poslední úspěšná kontrola session
   const lastSessionCheckRef = useRef<number>(Date.now());

   // Optimalizovaná funkce pro získání profilu
   const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
       if (!userId) return null;

       try {
           const { data, error } = await supabase
               .from('profiles')
               .select('*')
               .eq('id', userId)
               .single();

           if (error) {
               console.error('Profile fetch error:', error.message);
               return null;
           }

           lastSessionCheckRef.current = Date.now();
           return data;
       } catch (error) {
           console.error('Error fetching profile:', error);
           return null;
       }
   }, []);

   // Bezpečné resetování stavu autentizace
   const resetAuthState = useCallback(async () => {
       // Pouze pokud nějaká operace již neprobíhá
       if (inProgressRef.current) return;

       inProgressRef.current = true;

       try {
           setUser(null);
           setProfile(null);
           setIsAdmin(false);

           // Systematické čištění localStorage
           const authKeys = ['supabase.auth.token', 'supabase.auth.refreshToken'];
           for (const key of Object.keys(localStorage)) {
               if (key.startsWith('sb-') || authKeys.includes(key) || key.includes('supabase')) {
                   localStorage.removeItem(key);
               }
           }

           // Explicitní odhlášení, ale nečekáme na výsledek
           supabase.auth.signOut().catch(e => console.warn('Sign out error during reset:', e));

       } catch (error) {
           console.error('Error during auth state reset:', error);
       } finally {
           inProgressRef.current = false;
       }
   }, []);

   // Kontrola platnosti session s rate-limitingem a debounce
   const checkSession = useCallback(async (force = false) => {
       // Prevence nadbytečných kontrol
       const now = Date.now();
       const minInterval = 10000; // 10 sekund mezi kontrolami

       if (!force && (inProgressRef.current || now - lastSessionCheckRef.current < minInterval)) {
           return;
       }

       inProgressRef.current = true;

       try {
           const { data: { session }, error } = await supabase.auth.getSession();

           if (error) {
               console.warn('Session check failed:', error.message);
               await resetAuthState();
               return;
           }

           if (!session) {
               if (user !== null) {
                   console.log('Session expired, resetting state');
                   await resetAuthState();
               }
               return;
           }

           // Pokud existuje session, ale nemáme uživatele, načteme profil
           if (!user && session.user) {
               const profileData = await fetchProfile(session.user.id);
               if (profileData) {
                   setUser(session.user);
                   setProfile(profileData);
                   setIsAdmin(profileData.is_admin);
               } else {
                   // Profil se nepodařilo načíst, resetujeme stav
                   console.warn('Profile not found for session user');
                   await resetAuthState();
               }
           }

           lastSessionCheckRef.current = now;
       } catch (err) {
           console.error('Error checking session:', err);
       } finally {
           inProgressRef.current = false;
       }
   }, [user, fetchProfile, resetAuthState]);

   // Inicializace autentizace
   useEffect(() => {
       let mounted = true;
       let subscription: { data: { subscription: any } } | null = null;

       const setupAuth = async () => {
           setIsLoading(true);

           try {
               // Získání aktuální session
               const { data, error } = await supabase.auth.getSession();

               if (error) {
                   console.error('Initial session error:', error.message);
                   await resetAuthState();
                   return;
               }

               if (mounted) {
                   if (data.session?.user) {
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
                           console.log('Auth state changed:', event);

                           if (event === 'SIGNED_OUT') {
                               await resetAuthState();
                               return;
                           }

                           if (session?.user) {
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
                   );

                   subscription = authListener;
               }
           } catch (error) {
               console.error('Auth initialization error:', error);
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

       // Nastavení activity timeru pro periodickou kontrolu session
       const setupActivityTracker = () => {
           // Čistá kontrola každých 5 minut
           const checkInterval = 5 * 60 * 1000;

           activityTimerRef.current = setInterval(() => {
               checkSession(false);
           }, checkInterval);

           // Kontrola session při focus události
           const handleVisibilityChange = () => {
               if (document.visibilityState === 'visible') {
                   checkSession(false);
               }
           };

           // Kontrola session při aktivitě uživatele
           const handleUserActivity = debounce(() => {
              checkSession(false);
            }, 3000);

           document.addEventListener('visibilitychange', handleVisibilityChange);
           window.addEventListener('focus', handleUserActivity);

           // Pokročilé sledování aktivity s omezenou frekvencí volání
           const activities = ['mousedown', 'keydown', 'touchstart', 'click'];
           activities.forEach(activity => {
               document.addEventListener(activity, handleUserActivity, { passive: true });
           });

           return () => {
               if (activityTimerRef.current) {
                   clearInterval(activityTimerRef.current);
               }

               document.removeEventListener('visibilitychange', handleVisibilityChange);
               window.addEventListener('focus', handleUserActivity);

               activities.forEach(activity => {
                   document.removeEventListener(activity, handleUserActivity);
               });
           };
       };

       const cleanup = setupActivityTracker();

       return () => {
           mounted = false;
           if (subscription) {
               subscription.data.subscription.unsubscribe();
           }
           cleanup();
       };
   }, [checkSession, fetchProfile, resetAuthState]);

   // Optimalizovaná implementace přihlášení
   const signIn = async (email: string, password: string) => {
       if (inProgressRef.current) {
           toast.info('Přihlašování již probíhá, čekejte prosím...');
           return;
       }

       inProgressRef.current = true;
       setIsLoading(true);

       try {
           const { data, error } = await supabase.auth.signInWithPassword({
               email,
               password,
           });

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
           console.error('Error in signIn:', error);
           await resetAuthState();
           throw error;
       } finally {
           setIsLoading(false);
           inProgressRef.current = false;
       }
   };

   // Optimalizovaná implementace registrace
   const signUp = async (data: SignUpData) => {
       if (inProgressRef.current) {
           toast.info('Registrace již probíhá, čekejte prosím...');
           return;
       }

       inProgressRef.current = true;
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
           console.error('Chyba při registraci:', error);

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

   // Bezpečnější implementace odhlášení
   const signOut = async () => {
       if (inProgressRef.current) {
           toast.info('Odhlašování již probíhá, čekejte prosím...');
           return;
       }

       inProgressRef.current = true;
       setIsLoading(true);

       try {
           // Zobrazit uživateli, že probíhá odhlašování
           toast.info('Odhlašování...');

           // Nejprve resetujeme stav autentizace (lokálně)
           setUser(null);
           setProfile(null);
           setIsAdmin(false);

           // Poté se pokusíme o standardní odhlášení
           const { error } = await supabase.auth.signOut();
           if (error) {
               console.warn('Error during sign out:', error.message);
               // I při chybě pokračujeme dále
           }

           // Komplexní reset localStorage
           await resetAuthState();

           // Oznámení úspěšného odhlášení
           toast.success('Odhlášení bylo úspěšné');

           // Přidáme timeout pro zajištění, že se UI správně aktualizuje
           setTimeout(() => {
               window.location.href = '/';
           }, 500);
       } catch (error) {
           console.error('Error in signOut:', error);

           // I při chybě reset a přesměrování
           await resetAuthState();
           window.location.href = '/';
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
       updateProfile: async (data: UpdateProfileData) => {
           if (!user) {
               throw new Error('Uživatel není přihlášen');
           }

           if (inProgressRef.current) {
               toast.info('Aktualizace profilu již probíhá, čekejte prosím...');
               return;
           }

           inProgressRef.current = true;
           setIsLoading(true);

           try {
               const { error } = await supabase
                   .from('profiles')
                   .update({
                       ...data,
                       updated_at: new Date().toISOString(),
                   })
                   .eq('id', user.id);

               if (error) throw error;

               const updatedProfile = await fetchProfile(user.id);
               if (!updatedProfile) {
                   throw new Error('Nepodařilo se načíst aktualizovaný profil');
               }

               setProfile(updatedProfile);
               toast.success('Profil byl úspěšně aktualizován');
           } catch (error) {
               console.error('Error updating profile:', error);
               toast.error('Chyba při aktualizaci profilu');

               if (error instanceof Error) {
                   throw new Error(error.message);
               }
               throw new Error('Chyba při aktualizaci profilu');
           } finally {
               setIsLoading(false);
               inProgressRef.current = false;
           }
       },
       refreshProfile: async () => {
           if (!user) return;

           if (inProgressRef.current) {
               console.log('Operation in progress, skipping profile refresh');
               return;
           }

           inProgressRef.current = true;

           try {
               const profileData = await fetchProfile(user.id);
               if (profileData) {
                   setProfile(profileData);
               } else {
                   toast.error('Nepodařilo se obnovit profil');
                   throw new Error('Nepodařilo se obnovit profil');
               }
           } catch (error) {
               console.error('Error refreshing profile:', error);
           } finally {
               inProgressRef.current = false;
           }
       }
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
