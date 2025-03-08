'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowLeft, Mail, RefreshCw, Wine, Home } from 'lucide-react';

export default function RegisterSuccessPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-xl mx-auto">
                {/* Horní navigační lišta */}
                <div className="bg-white shadow-sm rounded-t-lg p-4 mb-1 flex justify-between items-center">
                    <Link
                        href="/"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Zpět na katalog</span>
                        <span className="sm:hidden">Zpět</span>
                    </Link>
                    <div className="flex items-center">
                        <Wine className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="font-semibold text-gray-900">VINARIA s.r.o.</span>
                    </div>
                </div>

                {/* Hlavní obsah */}
                <div className="bg-white p-8 rounded-b-lg shadow-md">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center h-20 w-20 bg-green-100 rounded-full mb-4">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-3">Registrace úspěšná!</h1>
                        <p className="text-gray-600 max-w-md mx-auto">
                            Děkujeme za vytvoření účtu. Již jen jeden krok k dokončení registrace.
                        </p>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-lg mb-6 border-l-4 border-blue-500">
                        <div className="flex items-start">
                            <Mail className="w-6 h-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-2">Potvrďte svůj email</h2>
                                <p className="text-gray-700 mb-3">
                                    Odeslali jsme vám email s potvrzovacím odkazem na adresu, kterou jste zadali při registraci.
                                </p>
                                <div className="mb-4 p-4 bg-white rounded-lg border border-blue-200">
                                    <p className="text-gray-700 mb-2 font-medium">Co dělat dál:</p>
                                    <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                                        <li>Otevřete svou emailovou schránku</li>
                                        <li>Najděte email od VINARIA s.r.o.</li>
                                        <li>Klikněte na potvrzovací odkaz v emailu</li>
                                    </ol>
                                </div>
                                <p className="text-gray-700">
                                    Po úspěšném potvrzení emailu se budete moci přihlásit do svého B2B účtu.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-50 p-5 rounded-lg mb-6 flex items-start border-l-4 border-yellow-400">
                        <RefreshCw className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="font-medium text-gray-900 mb-1">Email nedorazil?</h3>
                            <p className="text-gray-700 text-sm">
                                Zkontrolujte prosím složku <strong>spam nebo nevyžádaná pošta</strong>.
                                Doručení může trvat až několik minut.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center px-5 py-3 bg-blue-600 text-white font-medium rounded-lg
                                     hover:bg-blue-700 transition-colors"
                        >
                            <Mail className="w-5 h-5 mr-2" />
                            Přejít na přihlášení
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center px-5 py-3 bg-gray-100 text-gray-800 font-medium rounded-lg
                                     hover:bg-gray-200 transition-colors"
                        >
                            <Home className="w-5 h-5 mr-2" />
                            Zpět na katalog
                        </Link>
                    </div>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                        Potřebujete pomoc? Kontaktujte nás na <a href="mailto:info@vinaria.cz" className="text-blue-600 hover:underline">info@vinaria.cz</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
