'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowLeft, Mail } from 'lucide-react';

export default function RegisterSuccessPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
                <div className="mb-6">
                    <Link
                        href="/"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Zpět na katalog
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Registrace úspěšná</h1>
                    <p className="text-gray-600">Děkujeme za vaši registraci!</p>
                </div>

                <div className="bg-blue-50 p-6 rounded-lg mb-6">
                    <div className="flex items-start">
                        <Mail className="w-6 h-6 text-blue-600 mr-3 mt-0.5" />
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">Kontrola emailu</h2>
                            <p className="text-gray-700 mb-3">
                                Odeslali jsme vám email s potvrzovacím odkazem. Prosím, zkontrolujte svou
                                emailovou schránku a klikněte na odkaz pro dokončení registrace.
                            </p>
                            <p className="text-gray-700">
                                Po potvrzení emailu se budete moci přihlásit do svého účtu.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Email nedorazil? Zkontrolujte prosím složku spam nebo nevyžádaná pošta.
                </div>
            </div>
        </div>
    );
}
