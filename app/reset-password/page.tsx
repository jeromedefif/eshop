'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Wine } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
    const [isReset, setIsReset] = useState(false);
    const [hasRecoverySession, setHasRecoverySession] = useState(false);

    const router = useRouter();

    // Kontrola, zda uživatel má aktivní recovery session
    useEffect(() => {
        const checkSession = async () => {
            try {
                setCheckingSession(true);

                // Získání session ze Supabase
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Chyba při kontrole session:', error);
                    setError('Nepodařilo se ověřit vaši session');
                    return;
                }

                // Pokud nemáme session, uživatel nebyl správně přesměrován
                if (!data.session) {
                    console.log('Žádná aktivní session nebyla nalezena');
                    setError('K této stránce nelze přistupovat přímo. Použijte odkaz zaslaný na váš email.');
                    return;
                }

                // Pokud máme platnou session, můžeme pokračovat
                console.log('Aktivní session nalezena');

                // Zde neověřujeme, zda je session recovery typu, protože
                // Supabase to již ověřil před přesměrováním
                setHasRecoverySession(true);
            } catch (err) {
                console.error('Neočekávaná chyba při kontrole session:', err);
                setError('Došlo k neočekávané chybě při ověřování vašeho přístupu');
            } finally {
                setCheckingSession(false);
            }
        };

        checkSession();
    }, []);

    // Kontrola shody hesel
    useEffect(() => {
        if (password && confirmPassword) {
            setPasswordsMatch(password === confirmPassword);
        } else {
            setPasswordsMatch(null);
        }
    }, [password, confirmPassword]);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validace
        if (password.length < 6) {
            setError('Heslo musí mít alespoň 6 znaků');
            return;
        }

        if (password !== confirmPassword) {
            setError('Hesla se neshodují');
            return;
        }

        setIsLoading(true);

        try {
            // DŮLEŽITÉ: Tady používáme standardní updateUser bez žádných zvláštních parametrů
            // Supabase automaticky aktualizuje heslo pro aktivní recovery session
            console.log('Aktualizuji heslo');
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) {
                console.error('Chyba při aktualizaci hesla:', updateError);
                throw updateError;
            }

            console.log('Heslo úspěšně aktualizováno');
            toast.success('Heslo bylo úspěšně změněno');
            setIsReset(true);

            // Přesměrovat zpět na login po úspěšném resetu
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (error) {
            console.error('Chyba při resetu hesla:', error);
            setError(error instanceof Error ? error.message : 'Chyba při resetování hesla');
        } finally {
            setIsLoading(false);
        }
    };

    // Zobrazení stavu načítání při kontrole session
    if (checkingSession) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4 inline-block"></div>
                        <p className="text-gray-900">Ověřování session...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Zobrazení chyby, pokud uživatel nemá recovery session
    if (!hasRecoverySession && !isReset) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
                    <div className="text-center mb-6">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h1 className="text-xl font-bold text-gray-900 mb-2">Neplatný přístup</h1>
                        <p className="text-gray-600 mb-6">
                            {error || 'K této stránce nelze přistupovat přímo. Použijte odkaz zaslaný na váš email.'}
                        </p>
                        <Link
                            href="/forgot-password"
                            className="inline-block px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Vyžádat nový odkaz
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
                <div className="mb-6">
                    <Link
                        href="/login"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Zpět na přihlášení
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-16 w-16 bg-blue-100 rounded-full text-blue-600 mb-4">
                        <Wine className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Resetování hesla</h1>
                    <p className="text-gray-600 mt-2">
                        Zadejte své nové heslo
                    </p>
                </div>

                {isReset ? (
                    <div className="bg-green-50 p-6 rounded-lg text-center">
                        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Heslo úspěšně změněno!</h2>
                        <p className="text-gray-700 mb-4">
                            Vaše heslo bylo úspěšně resetováno. Nyní budete přesměrováni na přihlašovací stránku.
                        </p>
                        <Link
                            href="/login"
                            className="inline-block px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Přejít na přihlášení
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="bg-blue-50 p-5 rounded-lg space-y-4">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                    <Lock className="w-4 h-4 mr-2 text-gray-600" />
                                    Nové heslo
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 pr-10"
                                        required
                                        disabled={isLoading}
                                        placeholder="Zadejte nové heslo"
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={togglePasswordVisibility}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Heslo musí mít alespoň 6 znaků</p>
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                    <Lock className="w-4 h-4 mr-2 text-gray-600" />
                                    Potvrzení hesla
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="confirmPassword"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none text-gray-900 pr-10 ${
                                            passwordsMatch === true
                                                ? 'border-green-500 focus:ring-green-500'
                                                : passwordsMatch === false
                                                    ? 'border-red-500 focus:ring-red-500'
                                                    : 'focus:ring-blue-500'
                                        }`}
                                        required
                                        disabled={isLoading}
                                        placeholder="Potvrďte nové heslo"
                                    />
                                    {passwordsMatch !== null && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {passwordsMatch ? (
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <AlertCircle className="w-5 h-5 text-red-500" />
                                            )}
                                        </div>
                                    )}
                                </div>
                                {passwordsMatch === false && (
                                    <p className="text-xs text-red-500 mt-1">Hesla se neshodují</p>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm flex items-start">
                                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                                <div>{error}</div>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700
                                    transition-colors disabled:bg-blue-300 flex items-center justify-center"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Resetuji heslo...
                                </>
                            ) : (
                                'Nastavit nové heslo'
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
