'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

type LoginDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onLogin: (password: string) => void;
};

const LoginDialog = ({ isOpen, onClose, onLogin }: LoginDialogProps) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'jeromedefif') {
            onLogin(password);
            setPassword('');
            setError('');
        } else {
            setError('Nesprávné heslo');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-gray-900 mb-4">Přihlášení do správy</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                            autoFocus
                        />
                        {error && (
                            <p className="text-red-600 text-sm mt-1">{error}</p>
                        )}
                    </div>

                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                        >
                            Zrušit
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Přihlásit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginDialog;
