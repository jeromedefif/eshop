'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { signIn, user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Kontrola, zda byl email ověřen (parametr verified=true v URL)
    const isVerified = searchParams.get('verified') === 'true';

    // Přesměrovat přihlášeného uživatele
    useEffect(() => {
        if (user) {
            router.push('/');
        }
    }, [user, router]);

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
                {isVerified && (
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
