// components/SuccessNotification.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';

const SuccessNotification = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const orderSuccess = localStorage.getItem('orderSuccess');
        if (orderSuccess === 'true') {
            setVisible(true);

            // Přidáme padding-top k main contentu, aby se posunul dolů
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.style.paddingTop = '3rem'; // Odpovídá výšce notifikace
            }
        }

        return () => {
            // Cleanup - vrátíme padding zpět, když se komponenta odmontuje
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.style.paddingTop = '';
            }
        };
    }, []);

    const handleClose = () => {
        setVisible(false);
        localStorage.removeItem('orderSuccess');

        // Vrátíme padding zpět při zavření notifikace
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.style.paddingTop = '';
        }
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-x-0 top-16 bg-green-100 border-b border-green-200 py-3 z-40">
            <div className="container mx-auto px-4 flex items-center justify-between">
                <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <p className="text-green-800 font-medium">Vaše objednávka byla úspěšně odeslána! Děkujeme.</p>
                </div>
                <button onClick={handleClose} className="text-green-700 hover:text-green-900">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default SuccessNotification;
