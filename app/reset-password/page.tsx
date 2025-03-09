'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Ultra zjednodušená funkce pro reset hesla
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Základní validace
        if (password.length < 6) {
            setError('Heslo musí mít alespoň 6 znaků');
            return;
        }

        if (password !== confirmPassword) {
            setError('Hesla se neshodují');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Jednoduchá aktualizace hesla bez dalších komplikací
            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                throw error;
            }

            // Nastavit úspěch
            setSuccess(true);

            // Pokusit se odhlásit - ale neblokovat proces
            try {
                await supabase.auth.signOut();
            } catch (e) {
                console.error('Chyba při odhlašování:', e);
                // Pokračujeme i v případě chyby
            }

        } catch (err) {
            console.error('Chyba při resetování hesla:', err);
            setError(err instanceof Error ? err.message : 'Chyba při resetování hesla');
        } finally {
            setIsLoading(false);
        }
    };

    // Pokud reset byl úspěšný, zobrazíme potvrzení
    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
                    <h1 className="text-2xl font-bold mb-4">Heslo úspěšně změněno!</h1>
                    <p className="mb-6">Vaše heslo bylo úspěšně změněno. Nyní se můžete přihlásit s novým heslem.</p>

                    <div className="flex flex-col space-y-3">
                        <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Přejít na přihlášení
                        </a>
                        <a href="/" className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
                            Zpět na hlavní stránku
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // Formulář pro reset hesla
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <h1 className="text-2xl font-bold mb-2 text-center">Resetování hesla</h1>
                <p className="text-gray-600 mb-6 text-center">Zadejte své nové heslo</p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Nové heslo
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                            required
                            minLength={6}
                            disabled={isLoading}
                        />
                        <p className="text-xs text-gray-500 mt-1">Heslo musí mít alespoň 6 znaků</p>
                    </div>

                    <div className="mb-6">
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Potvrzení hesla
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-md mb-4">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Resetuji heslo...' : 'Nastavit nové heslo'}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <Link href="/login" className="text-blue-600 hover:underline">
                        Zpět na přihlášení
                    </Link>
                </div>
            </div>
        </div>
    );
}
