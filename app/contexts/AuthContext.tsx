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
    is_admin: boolean;
}

interface SignUpData {
    email: string;
    password: string;
    metadata: {
        full_name: string;
        company: string;
        phone: string;
    };
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    isInitialized: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (data: SignUpData) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    const fetchProfile = async (userId: string) => {
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
                    const profileData = await fetchProfile(session.user.id);
                    if (profileData) {
                        setUser(session.user);
                        setProfile(profileData);
                    } else {
                        await resetAuthState();
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                if (retryCount < maxRetries) {
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return tryInitialize();
                } else {
                    await resetAuthState();
                    setIsInitialized(true);
                }
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
                        console.log('Auth state changed:', event);

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

            if (error) throw error;

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

            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            });

            if (signUpError) throw signUpError;

            if (!authData.user) {
                throw new Error('Registrace se nezdařila');
            }

            const { error: profileError } = await supabase
                .from('profiles')
                .insert([{
                    id: authData.user.id,
                    email: email,
                    full_name: metadata.full_name,
                    company: metadata.company,
                    phone: metadata.phone,
                    is_admin: false
                }]);

            if (profileError) throw profileError;

            setUser(authData.user);
            await fetchProfile(authData.user.id);
        } catch (error) {
            console.error('Error in signUp:', error);
            await resetAuthState();
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        setIsLoading(true);
        try {
            await supabase.auth.signOut();
            await resetAuthState();
            window.location.href = '/';
        } catch (error) {
            console.error('Error in signOut:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            const profileData = await fetchProfile(user.id);
            if (profileData) {
                setProfile(profileData);
            }
        }
    };

    if (!isInitialized) {
        return (
            <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4 inline-block"></div>
                    <p className="text-gray-600">Načítání aplikace...</p>
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
