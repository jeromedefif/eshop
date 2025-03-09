'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Mail, Lock, LogIn, Eye, EyeOff, Wine, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showVerificationMessage, setShowVerificationMessage] = useState(false);
    const [showResetMessage, setShowResetMessage] = useState(false);
    const [isFormDisabled, setIsFormDisabled] = useState(false);
    const { signIn, user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Detekce URL parametrů
    useEffect(() => {
        // Ověříme, zda přicházíme z verifikačního emailu
        const isVerified = searchParams.get('verified') === 'true';
        // Ověříme, zda přicházíme z resetu hesla
        const isReset = searchParams.get('reset') === 'true';

        if (isVerified) {
            // Zobrazit zprávu o úspěšné verifikaci
            setShowVerificationMessage(true);
        }

        if (isReset) {
            // Zobrazit zprávu o úspěšném resetu hesla
            setShowResetMessage(true);

            // Dočasně zakážeme formulář
            setIsFormDisabled(true);

            // Na jistotu provedeme lokální odhlášení
            const forceLocalSignOut = async () => {
                try {
                    console.log('Vynucené lokální odhlášení po resetu hesla');
                    // Explicitní odhlášení pro jistotu
                    await supabase.auth.signOut();

                    // Vyčištění localStorage a cookies pro Supabase
                    const keysToRemove = Object.keys(localStorage).filter(key =>
                        key.startsWith('sb-') || key.includes('supabase')
                    );
                    keysToRemove.forEach(key => localStorage.removeItem(key));

                    // Po 2 sekundách povolíme formulář
                    setTimeout(() => {
                        setIsFormDisabled(false);
                    }, 2000);
                } catch (e) {
                    console.error('Chyba při vynuceném odhlášení:', e);
                    // I v případě chyby po 2 sekundách povolíme formulář
                    setTimeout(() => {
                        setIsFormDisabled(false);
                    }, 2000);
                }
            };

            forceLocalSignOut();
        }

        // Načtení uloženého emailu z localStorage, pokud existuje
        const savedEmail = localStorage.getItem('lastLoginEmail');
        if (savedEmail) {
            setEmail(savedEmail);
        }
    }, [searchParams]);

    // Sledování stavu přihlášení a přesměrování po úspěšném přihlášení
    useEffect(() => {
        // Pokud je uživatel přihlášen, je čas přesměrovat
        if (user) {
            // Přidáme malé zpoždění pro zobrazení úspěšného přihlášení
            const redirectTimer = setTimeout(() => {
                router.push('/');
            }, 1000); // 1 sekunda zpoždění pro zobrazení zprávy o úspěšném přihlášení

            // Uklidit časovač, pokud se komponenta odmontuje
            return () => clearTimeout(redirectTimer);
        }
    }, [user, router]);

    // Funkce pro přihlášení
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await signIn(email, password);
            // Uložíme email pro příští přihlášení
            localStorage.setItem('lastLoginEmail', email);

            // Přidáme explicitní přesměrování přímo zde
            router.push('/');
        } catch (error) {
            console.error('Sign in error:', error);
            setError(error instanceof Error ? error.message : 'Chyba při přihlašování');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const ResetPasswordMessage = () => (
        <div className="mb-6 p-4 bg-orange-50 rounded-lg">
            <div className="flex items-start">
                <RefreshCw className="w-5 h-5 text-orange-500 mr-2 mt-0.5" />
                <div>
                    <h3 className="font-medium text-gray-900">Heslo bylo úspěšně změněno</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        {isFormDisabled ? (
                            <>
                                Připravujeme přihlašovací formulář, prosím počkejte chvilku...
                                <div className="flex items-center mt-2">
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                                    <span className="text-blue-600 text-xs">Připravuje se</span>
                                </div>
                            </>
                        ) : (
                            'Nyní se můžete přihlásit s novým heslem.'
                        )}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
                <div className="mb-6">
                    <Link
                        href="/"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Zpět na katalog
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-16 w-16 bg-blue-100 rounded-full text-blue-600 mb-4">
                        <Wine className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Přihlášení</h1>
                    <p className="text-gray-600 mt-2">Přihlaste se k přístupu do svého B2B účtu VINARIA s.r.o.</p>
                </div>

                {/* Zobrazení oznámení o úspěšném ověření emailu */}
                {showVerificationMessage && (
                    <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>Váš email byl úspěšně ověřen! Nyní se můžete přihlásit.</span>
                    </div>
                )}

                {/* Zobrazení oznámení o resetování hesla */}
                {showResetMessage && <ResetPasswordMessage />}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="bg-blue-50 p-5 rounded-lg">
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                    <Mail className="w-4 h-4 mr-2 text-gray-600" />
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                    required
                                    disabled={isLoading || isFormDisabled}
                                    placeholder="vas@email.cz"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                    <Lock className="w-4 h-4 mr-2 text-gray-600" />
                                    Heslo
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 pr-10"
                                        required
                                        disabled={isLoading || isFormDisabled}
                                        placeholder="Zadejte heslo"
                                    />
                                    <button
                                        type="button"
                                        onClick={togglePasswordVisibility}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        tabIndex={-1}
                                        disabled={isFormDisabled}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm flex items-start">
                            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                            <div>{error}</div>
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <div className="text-sm">
                            {/* Odkaz na obnovení hesla */}
                            <Link href="/forgot-password" className="text-blue-600 hover:text-blue-800 font-medium">
                                Zapomenuté heslo?
                            </Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700
                                transition-colors disabled:bg-blue-300 flex items-center justify-center"
                        disabled={isLoading || isFormDisabled}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Přihlašování...
                            </>
                        ) : (
                            <>
                                <LogIn className="w-5 h-5 mr-2" />
                                Přihlásit se
                            </>
                        )}
                    </button>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        Nemáte účet?{' '}
                        <Link href="/register" className="text-blue-600 hover:text-blue-800 font-medium">
                            Registrujte se
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
