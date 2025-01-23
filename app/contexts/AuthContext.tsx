'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    company: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
}

interface SignUpData {
    email: string;
    password: string;
    metadata: {
        full_name: string;
        company: string;
        phone: string;
        address: string;
        city: string;
        postal_code?: string;
    };
}

interface UpdateProfileData {
    full_name?: string;
    company?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    isInitialized: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (data: SignUpData) => Promise<void>;
    signOut: () => Promise<void>;
    updateProfile: (data: UpdateProfileData) => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    const fetchProfile = async (userId: string) => {
    if (!userId) return null;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
};

    const resetAuthState = async () => {
        setUser(null);
        setProfile(null);
        try {
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith('sb-') || key.includes('supabase')) {
                    localStorage.removeItem(key);
                }
            }
            sessionStorage.clear();
        } catch (error) {
            console.error('Error clearing storage:', error);
        }
    };

    const initializeAuth = async () => {
    let retryCount = 0;
    const maxRetries = 3;

    const tryInitialize = async () => {
        try {
            setIsLoading(true);
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) throw error;

            setIsInitialized(true);

            if (session?.user) {
                try {
                    const profileData = await fetchProfile(session.user.id);
                    if (profileData) {
                        setUser(session.user);
                        setProfile(profileData);
                    }
                } catch (profileError) {
                    console.error('Error fetching profile during initialization:', profileError);
                }
            } else {
                // Pokud není uživatel přihlášen, pouze nastavíme initialized stav
                setUser(null);
                setProfile(null);
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            if (retryCount < maxRetries) {
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 500));
                return tryInitialize();
            }
            // V případě trvalého selhání resetujeme stav
            await resetAuthState();
            setIsInitialized(true);
        } finally {
            setIsLoading(false);
        }
    };

    await tryInitialize();
};

    useEffect(() => {
        let mounted = true;

        const setupAuth = async () => {
            if (mounted) {
                await initializeAuth();

                const { data: { subscription } } = supabase.auth.onAuthStateChange(
                    async (event, session) => {
                        if (!mounted) return;

                        if (session?.user) {
                            const profileData = await fetchProfile(session.user.id);
                            if (mounted && profileData) {
                                setUser(session.user);
                                setProfile(profileData);
                            } else {
                                await resetAuthState();
                            }
                        } else {
                            await resetAuthState();
                        }
                    }
                );

                return () => {
                    subscription.unsubscribe();
                };
            }
        };

        setupAuth();

        return () => {
            mounted = false;
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Nesprávné přihlašovací údaje');
                }
                throw error;
            }

            if (!data.user) {
                throw new Error('Přihlášení se nezdařilo');
            }

            const profileData = await fetchProfile(data.user.id);
            if (!profileData) {
                throw new Error('Nepodařilo se načíst profil uživatele');
            }

            setUser(data.user);
            setProfile(profileData);
        } catch (error) {
            console.error('Error in signIn:', error);
            await resetAuthState();
            throw error;
        } finally {
            setIsLoading(false);
        }
    };



    const signUp = async (data: SignUpData) => {
    setIsLoading(true);
    try {
        const { email, password, metadata } = data;
        const normalizedEmail = email.toLowerCase().trim();

        // Nejprve vytvoříme auth uživatele
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password
        });

        if (signUpError) throw signUpError;
        if (!authData?.user) throw new Error('Registrace se nezdařila');

        // Vyčkáme krátce na dokončení auth procesu
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Vytvoříme profil s minimálním množstvím dat
        const profileData = {
            id: authData.user.id,
            email: normalizedEmail,
            full_name: metadata.full_name,
            company: metadata.company,
            phone: metadata.phone,
            address: metadata.address,
            city: metadata.city,
            postal_code: metadata.postal_code || null,
            is_admin: false
        };

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert(profileData, {
                onConflict: 'id',
                ignoreDuplicates: false
            });

        if (profileError) {
            console.error('Chyba při vytváření profilu:', profileError);
            await supabase.auth.signOut();
            throw new Error('Chyba při vytváření profilu');
        }

        setUser(authData.user);
        setProfile(profileData);

    } catch (error: any) {
        console.error('Chyba při registraci:', error);
        await resetAuthState();

        if (error.message.includes('unique constraint')) {
            throw new Error('Uživatel s tímto emailem již existuje');
        }

        throw error;
    } finally {
        setIsLoading(false);
    }
};

    const signOut = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            await resetAuthState();
            window.location.href = '/';
        } catch (error) {
            console.error('Error in signOut:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const updateProfile = async (data: UpdateProfileData) => {
        if (!user) {
            throw new Error('Uživatel není přihlášen');
        }

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
        } catch (error: any) {
            console.error('Error updating profile:', error);
            throw new Error(error.message || 'Chyba při aktualizaci profilu');
        } finally {
            setIsLoading(false);
        }
    };

    const refreshProfile = async () => {
        if (!user) return;

        try {
            const profileData = await fetchProfile(user.id);
            if (profileData) {
                setProfile(profileData);
            } else {
                throw new Error('Nepodařilo se obnovit profil');
            }
        } catch (error) {
            console.error('Error refreshing profile:', error);
        }
    };

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
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshProfile
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
