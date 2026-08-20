'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Wine } from 'lucide-react';
import { toast } from 'react-toastify';
import AuthPageShell from '@/components/AuthPageShell';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isReset, setIsReset] = useState(false);
    const [sessionStatus, setSessionStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');

    useEffect(() => {
        let mounted = true;

        const verifyRecoverySession = async () => {
            try {
                const response = await fetch('/api/auth/reset-password', {
                    method: 'GET',
                    cache: 'no-store',
                });

                if (!mounted) return;

                if (response.ok) {
                    setSessionStatus('valid');
                    return;
                }

                setSessionStatus('invalid');
                setError('Odkaz pro reset hesla je neplatný nebo vypršel. Vyžádejte si prosím nový odkaz.');
            } catch {
                if (!mounted) return;
                setSessionStatus('invalid');
                setError('Nepodařilo se ověřit odkaz pro reset hesla. Zkuste to prosím znovu.');
            }
        };

        verifyRecoverySession();

        return () => {
            mounted = false;
        };
    }, []);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Jednoduchá funkce pro reset hesla
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

        if (sessionStatus !== 'valid') {
            setError('Odkaz pro reset hesla není platný. Vyžádejte si prosím nový odkaz.');
            return;
        }

        setIsLoading(true);

        try {
            console.log('Pokus o aktualizaci hesla');

            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            const result = await response.json().catch(() => null);

            if (!response.ok || !result?.success) {
                throw new Error(result?.error || 'Heslo se nepodařilo změnit. Vyžádejte si nový odkaz.');
            }

            console.log('Heslo bylo úspěšně aktualizováno');
            toast.success('Heslo bylo úspěšně změněno');
            setIsReset(true);

            // Server recovery session ukončil. Hard redirect zaručí čistý auth stav.
            setTimeout(() => {
                window.location.replace('/login?reset=success');
            }, 3000);
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

    return (
        <AuthPageShell active="login" width="md">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
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
                            href="/login?reset=success"
                            className="inline-block px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Přejít na přihlášení
                        </Link>
                    </div>
                ) : sessionStatus === 'checking' ? (
                    <div className="py-8 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                        <p className="mt-3 text-gray-600">Ověřuji odkaz pro reset hesla...</p>
                    </div>
                ) : sessionStatus === 'invalid' ? (
                    <div className="rounded-lg bg-red-50 p-6 text-center">
                        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                        <h2 className="mb-2 text-xl font-semibold text-gray-900">Neplatný odkaz</h2>
                        <p className="mb-5 text-gray-700">{error}</p>
                        <Link
                            href="/forgot-password"
                            className="inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                        >
                            Vyžádat nový odkaz
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
        </AuthPageShell>
    );
}
