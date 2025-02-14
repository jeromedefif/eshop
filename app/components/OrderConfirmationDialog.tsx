'use client';

import React from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import type { OrderConfirmationProps } from '../types/orders';

const OrderConfirmationDialog = ({
    isOpen,
    onClose,
    onConfirm,
    orderData,
    orderStatus
}: OrderConfirmationProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                    disabled={orderStatus === 'processing'}
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-2xl font-bold text-gray-900 mb-6">Potvrzení objednávky</h2>

                {/* Stavový indikátor */}
                <div className="mb-8">
                    <div className="flex justify-between mb-2">
                        {['Kontrola', 'Zpracování', 'Dokončeno'].map((step, index) => (
                            <div key={step} className="flex flex-col items-center flex-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                                    orderStatus === 'completed' ? 'bg-green-500 text-white' :
                                    orderStatus === 'processing' && index <= 1 ? 'bg-blue-500 text-white' :
                                    orderStatus === 'error' ? 'bg-red-500 text-white' :
                                    'bg-gray-200'
                                }`}>
                                    {index + 1}
                                </div>
                                <span className="text-sm text-gray-600">{step}</span>
                            </div>
                        ))}
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full relative">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                orderStatus === 'completed' ? 'bg-green-500 w-full' :
                                orderStatus === 'processing' ? 'bg-blue-500 w-2/3' :
                                orderStatus === 'error' ? 'bg-red-500' :
                                'bg-blue-500 w-1/3'
                            }`}
                        />
                    </div>
                </div>

                {/* Objednané položky */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Objednané položky:</h3>
                    <div className="space-y-2 mb-4">
                        {orderData.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-gray-700">
                                <span>{item.productName}</span>
                                <span>{item.display}</span>
                            </div>
                        ))}
                    </div>
                    {orderData.totalVolume > 0 && (
                        <div className="border-t pt-2 font-semibold text-gray-900">
                            Celkový objem nápojů: {orderData.totalVolume}L
                        </div>
                    )}
                </div>

                {/* Kontaktní údaje */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Kontaktní údaje:</h3>
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 text-gray-700">
                            <span className="font-medium">Jméno:</span>
                            <span>{orderData.customer.name}</span>
                        </div>
                        <div className="grid grid-cols-2 text-gray-700">
                            <span className="font-medium">Email:</span>
                            <span>{orderData.customer.email}</span>
                        </div>
                        <div className="grid grid-cols-2 text-gray-700">
                            <span className="font-medium">Telefon:</span>
                            <span>{orderData.customer.phone}</span>
                        </div>
                        {orderData.customer.company && (
                            <div className="grid grid-cols-2 text-gray-700">
                                <span className="font-medium">Firma:</span>
                                <span>{orderData.customer.company}</span>
                            </div>
                        )}
                        {orderData.customer.note && (
                            <div className="grid grid-cols-2 text-gray-700">
                                <span className="font-medium">Poznámka:</span>
                                <span>{orderData.customer.note}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tlačítka */}
                {orderStatus === 'error' ? (
                    <div className="flex items-center justify-center p-4 bg-red-50 text-red-700 rounded-lg">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        Došlo k chybě při zpracování objednávky
                    </div>
                ) : orderStatus === 'completed' ? (
                    <div className="flex items-center justify-center p-4 bg-green-50 text-green-700 rounded-lg">
                        <Check className="w-5 h-5 mr-2" />
                        Objednávka byla úspěšně dokončena
                    </div>
                ) : (
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                            disabled={orderStatus === 'processing'}
                        >
                            Zrušit
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            disabled={orderStatus === 'processing'}
                        >
                            Potvrdit objednávku
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderConfirmationDialog;
