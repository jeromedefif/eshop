'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showVerificationMessage, setShowVerificationMessage] = useState(false);
    const [isProcessingVerification, setIsProcessingVerification] = useState(false);
    const { signIn, user, signOut } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Zpracování verifikace emailu a přesměrování
    useEffect(() => {
        // Zjistíme, zda jsme na stránce přihlášení po verifikaci
        const isVerified = searchParams.get('verified') === 'true';
        const isPostVerification = sessionStorage.getItem('justVerified') === 'true';

        // Pokud jsme po verifikaci a máme uživatele (automaticky přihlášen)
        if (isVerified && user) {
            console.log('Detekována automatická verifikace, odhlašuji uživatele...');
            setIsProcessingVerification(true);

            // Uložíme příznak, že jsme prošli verifikací
            sessionStorage.setItem('justVerified', 'true');

            // Odhlásíme uživatele, aby se zobrazila přihlašovací obrazovka
            signOut().catch(console.error).finally(() => {
                setIsProcessingVerification(false);
            });
            return;
        }

        // Pokud jsme přišli z verifikace (ať již z parametru nebo ze sessionStorage)
        if (isVerified || isPostVerification) {
            setShowVerificationMessage(true);

            // Pokud jsme zpracovali verifikaci, vyčistíme příznak
            if (isPostVerification) {
                sessionStorage.removeItem('justVerified');
            }
        }

        // Přesměrovat přihlášeného uživatele na hlavní stránku
        if (user && !isProcessingVerification) {
            router.push('/');
        }
    }, [user, router, searchParams, signOut]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await signIn(email, password);
            router.push('/');
        } catch (error) {
            console.error('Sign in error:', error);
            setError(error instanceof Error ? error.message : 'Chyba při přihlašování');
        } finally {
            setIsLoading(false);
        }
    };

    // Zobrazíme načítací obrazovku během zpracování verifikace
    if (isProcessingVerification) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
                    <h2 className="text-xl font-semibold mb-2">Připravujeme přihlašovací stránku</h2>
                    <p className="text-gray-600">Moment prosím, zpracováváme vaši verifikaci...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
                <div className="mb-6">
                    <Link
                        href="/"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Zpět na e-shop
                    </Link>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-6">Přihlášení</h1>

                {/* Zobrazení oznámení o úspěšném ověření emailu */}
                {showVerificationMessage && (
                    <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>Váš email byl úspěšně ověřen! Nyní se můžete přihlásit.</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Heslo
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-4">
                        <Link
                            href="/"
                            className="px-4 py-2 text-gray-700 hover:text-gray-900"
                        >
                            Zrušit
                        </Link>
                        <button
                            type="submit"
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                                transition-colors disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Přihlašování...' : 'Přihlásit'}
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    Nemáte účet?{' '}
                    <Link href="/register" className="text-blue-600 hover:text-blue-800 font-medium">
                        Registrujte se
                    </Link>
                </div>
            </div>
        </div>
    );
}
