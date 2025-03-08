'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessingToken, setIsProcessingToken] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
    const [sessionEstablished, setSessionEstablished] = useState(false);

    // Detekce, zda se hesla shodují
    useEffect(() => {
        if (confirmPassword) {
            setPasswordsMatch(password === confirmPassword);
        } else {
            setPasswordsMatch(null);
        }
    }, [password, confirmPassword]);

    // Zpracování tokenu z URL
    useEffect(() => {
        const processToken = async () => {
            setIsProcessingToken(true);
            try {
                // Zkontrolujeme, zda není v URL token pro reset hesla
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const queryParams = new URLSearchParams(window.location.search);

                // Token může být v hash části URL nebo v query parametrech
                const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
                const type = hashParams.get('type') || queryParams.get('type');

                console.log("URL parametry:", {
                    hasAccessToken: !!accessToken,
                    hasRefreshToken: !!refreshToken,
                    type,
                    hash: window.location.hash,
                    search: window.location.search
                });

                // Pokud máme token, nastavíme session
                if (accessToken && type === 'recovery') {
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || ''
                    });

                    if (error) {
                        console.error("Chyba při nastavení session:", error);
                        setError("Chyba při nastavení session. Zkuste znovu požádat o reset hesla.");
                        return;
                    }

                    if (data.session) {
                        console.log("Session byla nastavena");
                        setSessionEstablished(true);
                    }
                }

                // Pokud nemáme token, zkontrolujeme, zda máme platnou session
                const { data } = await supabase.auth.getSession();
                if (data.session) {
                    console.log("Máme platnou session");
                    setSessionEstablished(true);
                } else {
                    console.log("Nemáme platnou session");
                    setError("Pro nastavení nového hesla je nutné mít platný odkaz z emailu.");
                }
            } catch (e) {
                console.error("Chyba při zpracování tokenu:", e);
                setError("Došlo k chybě při zpracování přihlašovacích údajů.");
            } finally {
                setIsProcessingToken(false);
            }
        };

        processToken();
    }, [searchParams]);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Hesla se neshodují');
            return;
        }

        if (password.length < 6) {
            setError('Heslo musí obsahovat alespoň 6 znaků');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Aktualizace hesla přes Supabase API
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            // Při úspěchu zobrazíme potvrzení
            setIsSuccess(true);

            // Po 3 sekundách přesměrujeme na přihlášení
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (error) {
            console.error('Error updating password:', error);

            // Přesnější informace o chybě pro uživatele
            if (error instanceof Error) {
                if (error.message.includes('session')) {
                    setError('Relace pro reset hesla vypršela nebo chybí. Zkuste prosím znovu požádat o reset hesla.');
                } else {
                    setError(error.message);
                }
            } else {
                setError('Nepodařilo se změnit heslo');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Zobrazíme loading stav během zpracování tokenu
    if (isProcessingToken) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-lg text-gray-700">Zpracování požadavku pro obnovení hesla...</p>
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

                <h1 className="text-2xl font-bold text-gray-900 mb-6">Nastavení nového hesla</h1>

                {isSuccess ? (
                    <div className="bg-green-50 p-6 rounded-lg">
                        <div className="flex items-start">
                            <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-2">Heslo bylo úspěšně změněno</h2>
                                <p className="text-gray-700">
                                    Vaše heslo bylo úspěšně změněno. Nyní budete přesměrováni na přihlašovací stránku.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : error && !sessionEstablished ? (
                    <div className="bg-red-50 p-6 rounded-lg">
                        <div className="flex items-start">
                            <AlertCircle className="w-6 h-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-2">Chyba při zpracování požadavku</h2>
                                <p className="text-gray-700 mb-4">{error}</p>
                                <Link
                                    href="/forgot-password"
                                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Zkusit znovu
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-gray-600 mb-6">
                            Zadejte své nové heslo níže.
                        </p>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm flex items-center mb-6">
                                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                    <Lock className="w-4 h-4 mr-1 text-gray-600" />
                                    Nové heslo
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 pr-10"
                                        required
                                        disabled={isLoading}
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
                                <p className="text-xs text-gray-500 mt-1">Minimálně 6 znaků</p>
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                    <Lock className="w-4 h-4 mr-1 text-gray-600" />
                                    Potvrzení hesla
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="confirmPassword"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none text-gray-900 pr-10 ${
                                            passwordsMatch === true
                                                ? 'border-green-500 focus:ring-2 focus:ring-green-500'
                                                : passwordsMatch === false
                                                    ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                                                    : 'focus:ring-2 focus:ring-blue-500'
                                        }`}
                                        required
                                        disabled={isLoading}
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

                            <button
                                type="submit"
                                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center justify-center mt-6"
                                disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Nastavuji nové heslo...
                                    </>
                                ) : 'Nastavit nové heslo'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
