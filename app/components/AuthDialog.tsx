'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

type AuthDialogProps = {
    isOpen: boolean;
    onClose: () => void;
};

const AuthDialog = ({ isOpen, onClose }: AuthDialogProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (signInError) throw signInError;

            if (data?.user) {
                setEmail('');
                setPassword('');
                onClose();
            }
        } catch (error) {
            console.error('Sign in error:', error);
            setError(error instanceof Error ? error.message : 'Chyba při přihlašování');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                onClick={onClose}
            />

            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[101]">
                <div className="bg-white rounded-lg shadow-xl p-6 m-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Přihlášení</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            disabled={isLoading}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
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
                            <button
                                type="button"
                                className="text-sm text-blue-600 hover:text-blue-800"
                                onClick={() => {/* Implementace registrace */}}
                            >
                                Registrovat se
                            </button>
                            <div className="space-x-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50
                                             transition-colors disabled:opacity-50"
                                    disabled={isLoading}
                                >
                                    Zrušit
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                                             transition-colors disabled:opacity-50"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Přihlašování...' : 'Přihlásit'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default AuthDialog;
