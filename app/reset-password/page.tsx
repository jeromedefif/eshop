'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
    const [debugInfo, setDebugInfo] = useState<any>({});
    const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
    const [isReset, setIsReset] = useState(false);
    const [hasValidSession, setHasValidSession] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const processCodeAndDebug = async () => {
            // Shromažďujeme diagnostické informace
            const diagnosticInfo: any = {
                timestamp: new Date().toISOString(),
                hasSearchParams: !!searchParams,
                url: typeof window !== 'undefined' ? window.location.href : 'Not available',
                userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Not available'
            };

            // Získáme všechny parametry pro diagnostiku
            if (searchParams) {
                const params: Record<string, string> = {};
                searchParams.forEach((value, key) => {
                    params[key] = value;
                });
                diagnosticInfo.params = params;
                diagnosticInfo.hasCodeParam = !!params.code;
            }

            // Získáme code z URL
            const code = searchParams?.get('code');
            diagnosticInfo.code = code ? `${code.substring(0, 5)}...` : null;

            if (!code) {
                diagnosticInfo.error = 'No code parameter found in URL';
                setDebugInfo(diagnosticInfo);
                setError('Chybí kód pro reset hesla v URL. Zkontrolujte odkaz nebo požádejte o nový.');
                return;
            }

            // Zkontrolujeme existující session
            try {
                const { data: sessionData } = await supabase.auth.getSession();
                diagnosticInfo.hasExistingSession = !!sessionData.session;

                if (sessionData.session) {
                    diagnosticInfo.sessionInfo = {
                        userId: sessionData.session.user.id,
                        expires: new Date(sessionData.session.expires_at! * 1000).toISOString()
                    };

                    // Pokud již máme session, nastavíme stav a vrátíme se
                    setHasValidSession(true);
                    setDebugInfo(diagnosticInfo);
                    return;
                }
            } catch (sessionError) {
                diagnosticInfo.sessionCheckError = sessionError instanceof Error
                    ? sessionError.message
                    : 'Unknown session check error';
            }

            // Pokus o použití kódu z URL
            try {
                diagnosticInfo.attemptingCodeExchange = true;

                // KLÍČOVÁ ZMĚNA: Před výměnou kódu za session jasně logujeme, co děláme
                console.log(`Attempting to exchange code: ${code.substring(0, 5)}...`);

                // Přímé volání supabase API pro výměnu kódu za session
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                diagnosticInfo.exchangeCodeResult = {
                    success: !error,
                    errorMessage: error?.message,
                    hasData: !!data,
                    hasSession: !!data?.session
                };

                if (error) {
                    console.error("Code exchange error:", error);
                    diagnosticInfo.error = error.message;
                    setError(`Neplatný nebo vypršený kód pro reset hesla: ${error.message}`);
                } else if (!data.session) {
                    console.error("No session returned from code exchange");
                    diagnosticInfo.error = 'No session returned from valid code';
                    setError('Kód byl platný, ale nepodařilo se vytvořit session');
                } else {
                    // ALTERNATIVNÍ PŘÍSTUP: Zkusíme použít PKCEAuthResponseEvent
                    // Toto je pro případ, že je problém ve způsobu, jakým Supabase pracuje s kódy
                    console.log("Session created from code exchange:", data.session.user.id);
                    setHasValidSession(true);

                    // Odstranění kódu z URL bez přesměrování
                    if (typeof window !== 'undefined') {
                        const cleanUrl = window.location.pathname;
                        window.history.replaceState({}, document.title, cleanUrl);
                    }
                }
            } catch (codeError) {
                console.error("Error exchanging code for session:", codeError);
                diagnosticInfo.codeExchangeError = codeError instanceof Error
                    ? codeError.message
                    : 'Unknown code exchange error';
                setError('Chyba při zpracování kódu pro reset hesla');
            }

            // Aktualizujeme diagnostické informace
            setDebugInfo(diagnosticInfo);
        };

        processCodeAndDebug();
    }, [searchParams]);

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
        const resetInfo: any = {
            timestamp: new Date().toISOString(),
            passwordLength: password.length
        };

        try {
            // Kontrola session před pokusem o změnu hesla
            const { data: sessionCheck } = await supabase.auth.getSession();
            resetInfo.hasSessionBeforeUpdate = !!sessionCheck.session;

            if (!sessionCheck.session) {
                resetInfo.error = 'No valid session before password update';
                setError('Nemáte platnou session pro změnu hesla. Zkuste požádat o nový odkaz.');
                throw new Error('No valid session before password update');
            }

            // Pokus o aktualizaci hesla
            console.log("Attempting to update password");
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            resetInfo.updateResult = {
                success: !updateError,
                errorMessage: updateError?.message
            };

            if (updateError) {
                console.error('Error updating password:', updateError);
                resetInfo.error = updateError.message;
                throw updateError;
            }

            console.log('Password updated successfully');
            toast.success('Heslo bylo úspěšně změněno');
            setIsReset(true);

            // Přesměrovat zpět na login po úspěšném resetu
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (error) {
            console.error('Password reset error:', error);
            resetInfo.error = error instanceof Error ? error.message : 'Unknown error';
            setError(error instanceof Error ? error.message : 'Chyba při resetování hesla');
        } finally {
            setIsLoading(false);
            // Aktualizujeme diagnostické informace o resetu hesla
            setDebugInfo(prev => ({ ...prev, resetAttempt: resetInfo }));
        }
    };

    // Vytvoření komponenty pro zobrazení diagnostických informací
    const DebugPanel = () => (
        <div className="mt-8 border-t pt-4">
            <details>
                <summary className="cursor-pointer text-sm text-gray-500">Diagnostické informace (pro vývojáře)</summary>
                <div className="p-4 mt-2 bg-gray-100 rounded-lg text-xs overflow-auto max-h-64">
                    <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
            </details>
        </div>
    );

    // Zobrazení chybového stavu, pokud není platná session
    if (!hasValidSession && !isReset) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
                    <div className="text-center mb-6">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h1 className="text-xl font-bold text-gray-900 mb-2">Neplatný odkaz pro reset hesla</h1>
                        <p className="text-gray-600 mb-6">
                            {error || 'Odkaz je neplatný nebo vypršela jeho platnost. Prosím, vyžádejte si nový odkaz pro reset hesla.'}
                        </p>
                        <Link
                            href="/forgot-password"
                            className="inline-block px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Vyžádat nový odkaz
                        </Link>
                    </div>
                    <DebugPanel />
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
                <DebugPanel />
            </div>
        </div>
    );
}
