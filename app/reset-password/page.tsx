'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);

    // Detekce, zda se hesla shodují
    useEffect(() => {
        if (confirmPassword) {
            setPasswordsMatch(password === confirmPassword);
        } else {
            setPasswordsMatch(null);
        }
    }, [password, confirmPassword]);

    // KLÍČOVÁ ZMĚNA: Odstraníme kontrolu session, která nás přesměrovává zpět na login
    // Místo toho necháme uživatele pracovat se stránkou i bez aktivní session

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
            setError(error instanceof Error ? error.message : 'Nepodařilo se změnit heslo');
        } finally {
            setIsLoading(false);
        }
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
