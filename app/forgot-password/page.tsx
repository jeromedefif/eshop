'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            setError('Zadejte prosím emailovou adresu');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Přesměrování přímo na stránku pro reset hesla
            // ⚠️ DŮLEŽITÉ! Toto obchází callback handler a zpracuje token přímo na stránce reset-password
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            // Při úspěchu zobrazíme potvrzení a skryjeme formulář
            setIsSuccess(true);
        } catch (error) {
            console.error('Error requesting password reset:', error);
            setError(error instanceof Error ? error.message : 'Nepodařilo se odeslat žádost o reset hesla');
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

                <h1 className="text-2xl font-bold text-gray-900 mb-6">Obnovení hesla</h1>

                {isSuccess ? (
                    <div className="bg-green-50 p-6 rounded-lg">
                        <div className="flex items-start">
                            <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-2">Email byl odeslán</h2>
                                <p className="text-gray-700 mb-4">
                                    Pokyny k obnovení hesla byly odeslány na adresu <strong>{email}</strong>.
                                    Zkontrolujte svůj email a postupujte podle pokynů v emailu.
                                </p>
                                <p className="text-gray-700">
                                    Pokud email neobdržíte do 5 minut, zkontrolujte prosím složku spam
                                    nebo <Link href="/forgot-password" className="text-blue-600 hover:text-blue-800">
                                    zkuste to znovu</Link>.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-gray-600 mb-6">
                            Zadejte svůj email a my vám zašleme pokyny k obnovení hesla.
                        </p>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm flex items-center mb-6">
                                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1 flex items-center">
                                    <Mail className="w-4 h-4 mr-1 text-gray-600" />
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                    required
                                    disabled={isLoading}
                                    placeholder="vas@email.cz"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center justify-center"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Odesílám...
                                    </>
                                ) : 'Odeslat pokyny pro obnovení hesla'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
