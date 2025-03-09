'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Send, AlertCircle, Wine } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // KLÍČOVÁ ZMĚNA: Použijeme explicitní URL vedoucí na callback handler
            // Musí obsahovat ?type=recovery parametr
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.beginy.cz';
            const redirectUrl = `${baseUrl}/auth/callback?type=recovery`;

            console.log('Odesílám email pro reset hesla na:', email);
            console.log('Redirect URL:', redirectUrl);

            // Odeslání emailu pro reset hesla
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl
            });

            if (error) {
                console.error('Chyba při odesílání emailu pro reset hesla:', error);

                // Pro bezpečnost nezobrazujeme specifické chyby - kromě rate limitu
                if (error.message.includes('rate limit')) {
                    toast.error('Příliš mnoho pokusů. Zkuste to prosím později.');
                } else {
                    // Neprozrazujeme, zda email existuje
                    toast.success('Pokud email existuje v databázi, byl odeslán odkaz pro reset hesla');
                }
            } else {
                toast.success('Na váš email byl odeslán odkaz pro reset hesla');
            }

            // Vždy zobrazíme úspěšnou zprávu z bezpečnostních důvodů
            setIsSubmitted(true);
        } catch (error) {
            console.error('Forgot password error:', error);

            // Pro bezpečnost nezobrazujeme, zda email existuje nebo ne
            if (error instanceof Error && error.message.includes('rate limit')) {
                setError('Příliš mnoho pokusů. Zkuste to prosím později.');
            } else {
                // Dokonce i při neexistujícím emailu nastavíme stav jako odeslán
                // Toto je bezpečnostní opatření proti útokům na zjištění existujících emailů
                setIsSubmitted(true);
            }
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

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-16 w-16 bg-blue-100 rounded-full text-blue-600 mb-4">
                        <Wine className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Zapomenuté heslo</h1>
                    <p className="text-gray-600 mt-2">
                        Zadejte svůj email a my vám pošleme odkaz pro obnovení hesla.
                    </p>
                </div>

                {isSubmitted ? (
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center h-16 w-16 bg-green-100 rounded-full mb-4">
                            <Send className="h-8 w-8 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Email odeslán!</h1>
                        <p className="text-gray-600">
                            Pokud účet s touto emailovou adresou existuje, obdržíte odkaz pro resetování hesla.
                        </p>

                        <div className="bg-blue-50 p-4 rounded-lg mt-6 mb-6">
                            <p className="text-gray-800">
                                Zkontrolujte svou emailovou schránku a klikněte na odkaz v emailu pro nastavení nového hesla.
                            </p>
                        </div>

                        <div className="flex justify-between">
                            <Link
                                href="/login"
                                className="px-4 py-2 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                Zpět na přihlášení
                            </Link>
                            <button
                                onClick={() => setIsSubmitted(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Zkusit jiný email
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="bg-blue-50 p-5 rounded-lg">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                    <Mail className="w-4 h-4 mr-2 text-gray-600" />
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                                    required
                                    disabled={isLoading}
                                    placeholder="vas@email.cz"
                                />
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
                                    Odesílám...
                                </>
                            ) : (
                                'Odeslat odkaz pro reset hesla'
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
