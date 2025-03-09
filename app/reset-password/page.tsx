'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Wine, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isReset, setIsReset] = useState(false);
    const router = useRouter();

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Radikální čištění Supabase dat z prohlížeče
    const clearSupabaseData = () => {
        try {
            console.log('Čištění Supabase dat z prohlížeče');

            // 1. Vyčištění localStorage
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith('sb-') || key.includes('supabase')) {
                    console.log(`Čištění localStorage klíče: ${key}`);
                    localStorage.removeItem(key);
                }
            }

            // 2. Vyčištění cookies
            document.cookie.split(';').forEach(c => {
                const cookieName = c.trim().split('=')[0];
                if (cookieName.includes('sb-') || cookieName.includes('supabase')) {
                    console.log(`Čištění cookie: ${cookieName}`);
                    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                }
            });

            console.log('Čištění dokončeno');
        } catch (error) {
            console.error('Chyba při čištění dat:', error);
        }
    };

    // Funkce pro reset hesla
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
            console.log('Pokus o aktualizaci hesla');

            // Přímé volání Supabase API pro aktualizaci hesla
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                console.error('Chyba při aktualizaci hesla:', error);
                throw error;
            }

            console.log('Heslo bylo úspěšně aktualizováno');
            toast.success('Heslo bylo úspěšně změněno');

            // Odhlášení nejen z tohoto zařízení, ale globálně
            try {
                console.log('Explicitní globální odhlášení po resetu hesla');
                await supabase.auth.signOut({ scope: 'global' });
                console.log('Uživatel byl úspěšně odhlášen');

                // Radikální vyčištění dat
                clearSupabaseData();
            } catch (signOutError) {
                console.error('Chyba při odhlašování po resetu hesla:', signOutError);
                // I při chybě provedeme čištění
                clearSupabaseData();
            }

            // Nastavení stavu na dokončeno
            setIsReset(true);

        } catch (error) {
            console.error('Chyba při resetování hesla:', error);

            if (error instanceof Error) {
                if (error.message.includes('session') ||
                    error.message.includes('JWT') ||
                    error.message.includes('token')) {
                    setError('Platnost relace pro resetování hesla vypršela. Vyžádejte si nový odkaz.');
                } else {
                    setError(error.message);
                }
            } else {
                setError('Chyba při resetování hesla');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Funkce pro návrat na hlavní stránku s čistým stavem
    const handleGoToHome = () => {
        // Ještě jednou vyčistíme data pro jistotu
        clearSupabaseData();

        // Přesměrování na hlavní stránku
        window.location.href = '/';
    };

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
                        <p className="text-gray-700 mb-6">
                            Vaše heslo bylo úspěšně resetováno a byli jste bezpečně odhlášeni ze všech zařízení.
                        </p>

                        <div className="flex flex-col space-y-3">
                            <button
                                onClick={handleGoToHome}
                                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Přejít na hlavní stránku
                            </button>

                            <a
                                href="/login"
                                className="inline-flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
                                onClick={clearSupabaseData}
                            >
                                Přejít na přihlášení
                            </a>

                            <p className="text-sm text-gray-500 mt-2">
                                Pro přihlášení s novým heslem prosím klikněte na "Přejít na přihlášení" a zadejte své přihlašovací údaje.
                            </p>
                        </div>
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
                                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 pr-10"
                                        required
                                        disabled={isLoading}
                                        placeholder="Potvrďte nové heslo"
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
