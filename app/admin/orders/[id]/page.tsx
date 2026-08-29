'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, Trash2, Grape, Martini, Wine, FlaskConical, Package, Sparkles, Amphora, Copy, MessageSquare, LockKeyhole, Mail, Phone, Building2, CalendarDays, MapPin, ReceiptText, Truck } from 'lucide-react';
import Link from 'next/link';
import { withAdminAuth } from '@/components/auth/withAdminAuth';
import { toast } from 'react-toastify';
import { normalizeOrderCategory, sortOrderItems, STANDARD_ORDER_CATEGORIES } from '@/lib/order-item-sorting';

const OrderDetailPage = () => {
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string;

    const [order, setOrder] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [internalNote, setInternalNote] = useState('');
    const [savedInternalNote, setSavedInternalNote] = useState('');
    const [isLoadingInternalNote, setIsLoadingInternalNote] = useState(true);
    const [isSavingInternalNote, setIsSavingInternalNote] = useState(false);

    // Fetch order data
    useEffect(() => {
        const fetchOrderDetails = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/orders/${orderId}`);
                if (!response.ok) {
                    throw new Error('Nepodařilo se načíst detail objednávky');
                }
                const data = await response.json();
                setOrder(data);
                setStatus(data.status);
            } catch (error) {
                console.error('Error fetching order details:', error);
                toast.error('Nepodařilo se načíst detail objednávky');
            } finally {
                setIsLoading(false);
            }
        };

        if (orderId) {
            fetchOrderDetails();
        }
    }, [orderId]);

    // Interní poznámka je uložená odděleně od zákaznické objednávky a její endpoint
    // navíc ověřuje administrátorské oprávnění na serveru.
    useEffect(() => {
        const fetchInternalNote = async () => {
            if (!orderId) return;

            setIsLoadingInternalNote(true);
            try {
                const response = await fetch(`/api/orders/${orderId}/internal-note`, { cache: 'no-store' });
                if (!response.ok) throw new Error('Nepodařilo se načíst interní poznámku');
                const data = await response.json();
                const note = data.note || '';
                setInternalNote(note);
                setSavedInternalNote(note);
            } catch (error) {
                console.error('Error fetching internal order note:', error);
                toast.error('Nepodařilo se načíst interní poznámku');
            } finally {
                setIsLoadingInternalNote(false);
            }
        };

        fetchInternalNote();
    }, [orderId]);

    const persistInternalNote = async (noteValue: string) => {
        setIsSavingInternalNote(true);
        try {
            const response = await fetch(`/api/orders/${orderId}/internal-note`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: noteValue }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Nepodařilo se uložit interní poznámku');

            const savedNote = data.note || '';
            setInternalNote(savedNote);
            setSavedInternalNote(savedNote);
            toast.success(data.note ? 'Interní poznámka byla uložena' : 'Interní poznámka byla odstraněna');
        } catch (error) {
            console.error('Error saving internal order note:', error);
            toast.error(error instanceof Error ? error.message : 'Nepodařilo se uložit interní poznámku');
        } finally {
            setIsSavingInternalNote(false);
        }
    };

    const handleSaveInternalNote = () => persistInternalNote(internalNote);

    const handleDeleteInternalNote = async () => {
        if (!savedInternalNote || !window.confirm('Opravdu chcete interní poznámku odstranit?')) return;
        await persistInternalNote('');
    };

    const handleCopyOrderId = async () => {
        try {
            await navigator.clipboard.writeText(orderId);
            toast.success('ID objednávky bylo zkopírováno');
        } catch (error) {
            console.error('Error copying order ID:', error);
            toast.error('ID objednávky se nepodařilo zkopírovat');
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === status) return;

        setIsUpdating(true);
        setUpdateMessage(null);

        try {
            // 1. Aktualizace statusu objednávky v databázi
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Nepodařilo se aktualizovat status objednávky');
            }

            // 2. Odeslání emailu zákazníkovi při změně stavu (pouze pro confirmed a cancelled)
            if (newStatus === 'confirmed' || newStatus === 'cancelled') {
                try {
                    const emailResponse = await fetch('/api/orders/send-status-email', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            orderId: orderId,
                            status: newStatus
                        }),
                    });

                    if (!emailResponse.ok) {
                        console.warn('Nepodařilo se odeslat email, ale status byl změněn');
                    } else {
                        console.log('Email byl úspěšně odeslán');
                    }
                } catch (emailError) {
                    console.warn('Chyba při odesílání emailu:', emailError);
                    // Pokračujeme dál i v případě chyby s emailem
                }
            }

            // 3. Nastavit nový status v UI
            setStatus(newStatus);
            setUpdateMessage({
                type: 'success',
                text: `Status objednávky byl úspěšně změněn na "${getStatusText(newStatus)}"`
            });

            toast.success(`Status objednávky byl úspěšně změněn`);
        } catch (error) {
            console.error('Error updating order status:', error);
            setUpdateMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Nepodařilo se aktualizovat status objednávky'
            });
            toast.error('Nepodařilo se aktualizovat status objednávky');
        } finally {
            setIsUpdating(false);
        }
    };

    // Nová funkce pro mazání objednávky
    const handleDeleteOrder = async () => {
        setIsDeleting(true);
        setUpdateMessage(null);

        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'DELETE',
                headers: {
                    'Cache-Control': 'no-cache',
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Nepodařilo se smazat objednávku');
            }

            toast.success('Objednávka byla úspěšně smazána');

            // Přesměrování zpět na seznam objednávek
            router.push('/admin/orders');
        } catch (error) {
            console.error('Error deleting order:', error);
            setUpdateMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Nepodařilo se smazat objednávku'
            });
            toast.error('Nepodařilo se smazat objednávku');
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const getStatusColor = (currentStatus: string) => {
        switch (currentStatus) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'confirmed': return 'bg-blue-100 text-blue-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (currentStatus: string) => {
        switch (currentStatus) {
            case 'pending': return 'Čeká na potvrzení';
            case 'confirmed': return 'Potvrzeno';
            case 'cancelled': return 'Zrušeno';
            default: return currentStatus;
        }
    };

    const normalizeCategory = (category: string) => {
        return normalizeOrderCategory(category);
    };

    const categoryMeta: Record<string, {
        icon: React.ComponentType<{ className?: string }>;
        headerClass: string;
        badgeClass: string;
    }> = {
        'Víno': {
            icon: Grape,
            headerClass: 'bg-purple-50 text-purple-700',
            badgeClass: 'bg-purple-50 text-purple-700 border-purple-200'
        },
        'Perlivé': {
            icon: Sparkles,
            headerClass: 'bg-teal-50 text-teal-700',
            badgeClass: 'bg-teal-50 text-teal-700 border-teal-200'
        },
        'Nápoje': {
            icon: Martini,
            headerClass: 'bg-blue-50 text-blue-700',
            badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
        },
        'Ovocné víno': {
            icon: Wine,
            headerClass: 'bg-rose-50 text-rose-700',
            badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
        },
        'Burčák': {
            icon: Amphora,
            headerClass: 'bg-orange-50 text-orange-700',
            badgeClass: 'bg-orange-50 text-orange-700 border-orange-200'
        },
        'Plyny': {
            icon: FlaskConical,
            headerClass: 'bg-cyan-50 text-cyan-700',
            badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200'
        },
        'PET': {
            icon: Package,
            headerClass: 'bg-amber-50 text-amber-700',
            badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
        }
    };

    const parseLiters = (volume: string | number, quantity: number) => {
        const normalized = String(volume).replace(',', '.');
        const match = normalized.match(/(\d+(?:\.\d+)?)/);
        if (!match) return 0;
        return parseFloat(match[1]) * quantity;
    };

    const formatVolumeLabel = (volume: string | number, category: string) => {
        if (category === 'PET') return 'balení';
        if (category === 'Plyny') return String(volume).toLowerCase().includes('mal') ? 'malý' : 'velký';
        return /l\s*$/i.test(String(volume)) ? String(volume) : `${volume}L`;
    };

    const groupedItems = (() => {
        const groups: Array<{
            key: string;
            category: string;
            volumeLabel: string | null;
            items: any[];
        }> = [];

        for (const item of sortOrderItems(order?.order_items || [])) {
            const category = normalizeCategory(item?.product?.category || 'Ostatní');
            const isStandard = STANDARD_ORDER_CATEGORIES.includes(category as typeof STANDARD_ORDER_CATEGORIES[number]);
            const volumeLabel = isStandard ? formatVolumeLabel(item.volume, category) : null;
            const key = isStandard ? `${volumeLabel}-${category}` : category;
            const lastGroup = groups[groups.length - 1];

            if (lastGroup?.key === key) {
                lastGroup.items.push(item);
            } else {
                groups.push({ key, category, volumeLabel, items: [item] });
            }
        }

        return groups;
    })();

    // Komponenta pro potvrzovací dialog
    const DeleteConfirmationDialog = () => {
        if (!showDeleteConfirm) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Potvrzení smazání</h3>
                    <p className="text-gray-700 mb-6">
                        Opravdu chcete smazat tuto objednávku? Tato akce je nevratná a smaže všechny související položky.
                    </p>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                            disabled={isDeleting}
                        >
                            Zrušit
                        </button>
                        <button
                            onClick={handleDeleteOrder}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <span className="flex items-center">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Mazání...
                                </span>
                            ) : (
                                'Smazat objednávku'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2">Načítání objednávky...</span>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-red-600">Objednávka nebyla nalezena nebo nemáte oprávnění k jejímu zobrazení.</p>
                    <Link
                        href="/admin/orders"
                        className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Zpět na seznam objednávek
                    </Link>
                </div>
            </div>
        );
    }

    const isInternalNoteDirty = internalNote.trim() !== savedInternalNote.trim();
    const shortOrderId = order.id.slice(0, 8).toUpperCase();
    const billingAddress = [
        order.billing_address,
        [order.billing_postal_code, order.billing_city].filter(Boolean).join(' '),
        order.billing_country,
    ].filter(Boolean);
    const shippingAddress = [
        order.shipping_address,
        [order.shipping_postal_code, order.shipping_city].filter(Boolean).join(' '),
        order.shipping_country,
    ].filter(Boolean);
    const hasAddressSnapshot = billingAddress.length > 0 || shippingAddress.length > 0;

    return (
        <div className="w-full">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Link
                    href="/admin/orders"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Zpět na seznam objednávek
                </Link>
                <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Detail objednávky</h1>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="p-4 sm:p-5">
                    {/* Zobrazení zprávy o aktualizaci */}
                    {updateMessage && (
                        <div className={`mb-4 flex items-center rounded-lg p-3 ${
                            updateMessage.type === 'success'
                                ? 'bg-green-50 text-green-800'
                                : 'bg-red-50 text-red-800'
                        }`}>
                            {updateMessage.type === 'success'
                                ? <CheckCircle className="w-5 h-5 mr-2" />
                                : <AlertCircle className="w-5 h-5 mr-2" />
                            }
                            {updateMessage.text}
                        </div>
                    )}

                    {/* Kompaktní souhrn a kontakt zákazníka */}
                    <div className="mb-4 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(260px,1.25fr)_minmax(220px,1fr)_minmax(260px,1fr)]">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="truncate text-lg font-bold text-slate-950">{order.customer_name}</p>
                                {order.customer_company && <Building2 className="h-4 w-4 shrink-0 text-slate-400" />}
                            </div>
                            {order.customer_company && <p className="truncate text-sm font-medium text-slate-600">{order.customer_company}</p>}
                            {(order.customer_company_id || order.customer_vat_id) && (
                                <p className="mt-1 text-xs text-slate-500">
                                    {order.customer_company_id && <>IČO: {order.customer_company_id}</>}
                                    {order.customer_company_id && order.customer_vat_id && <span className="mx-2">•</span>}
                                    {order.customer_vat_id && <>DIČ: {order.customer_vat_id}</>}
                                </p>
                            )}
                            <div className="mt-2 flex flex-col gap-1 text-sm">
                                <a href={`mailto:${order.customer_email}`} className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-700 hover:underline">
                                    <Mail className="h-4 w-4 shrink-0 text-slate-400" /> {order.customer_email}
                                </a>
                                {order.customer_phone && (
                                    <a href={`tel:${order.customer_phone}`} className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-700 hover:underline">
                                        <Phone className="h-4 w-4 shrink-0 text-slate-400" /> {order.customer_phone}
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <CalendarDays className="h-4 w-4" /> Datum vytvoření
                            </div>
                            <p className="mt-1 font-semibold text-slate-900">{format(new Date(order.created_at), 'PPP', { locale: cs })}</p>
                            <button type="button" onClick={handleCopyOrderId} className="mt-2 inline-flex items-center gap-2 rounded-md bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100" title={order.id}>
                                #{shortOrderId} <Copy className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <div className="border-t border-slate-200 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-sm text-slate-500">Celkový objem</p>
                                    <p className="text-2xl font-bold text-blue-700">{order.total_volume} L</p>
                                </div>
                                {isUpdating && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(status)}`}>{getStatusText(status)}</span>
                                <select
                                    value={status}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    disabled={isUpdating}
                                >
                                    <option value="pending">Čeká na potvrzení</option>
                                    <option value="confirmed">Potvrzeno</option>
                                    <option value="cancelled">Zrušeno</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {order.note?.trim() && (
                        <div className="mb-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            <p className="whitespace-pre-wrap"><span className="font-semibold text-slate-900">Poznámka zákazníka:</span> {order.note}</p>
                        </div>
                    )}

                    {hasAddressSnapshot && (
                        <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-2">
                            {billingAddress.length > 0 && (
                                <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                                    <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                                    <div className="min-w-0 text-sm text-slate-700">
                                        <p className="mb-1 font-semibold text-slate-950">Fakturační adresa</p>
                                        {billingAddress.map((line: string) => <p key={line}>{line}</p>)}
                                    </div>
                                </div>
                            )}
                            {shippingAddress.length > 0 && (
                                <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3">
                                    <Truck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                                    <div className="min-w-0 text-sm text-slate-700">
                                        <p className="mb-1 font-semibold text-slate-950">Dodací adresa</p>
                                        {order.shipping_company && <p className="font-medium">{order.shipping_company}</p>}
                                        {order.shipping_contact_name && <p>{order.shipping_contact_name}</p>}
                                        {shippingAddress.map((line: string) => <p key={line}>{line}</p>)}
                                        {order.delivery_instructions && (
                                            <p className="mt-2 border-t border-blue-100 pt-2 text-slate-600">
                                                <MapPin className="mr-1 inline h-3.5 w-3.5" />{order.delivery_instructions}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Položky objednávky */}
                    <div className="mb-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-bold text-slate-950">Položky objednávky</h2>
                            <span className="text-sm text-slate-500">{order.order_items?.length || 0} položek</span>
                        </div>
                        <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                            {groupedItems.map(({ key, category, volumeLabel, items }, groupIndex) => {
                                const meta = categoryMeta[category] || {
                                    icon: Package,
                                    headerClass: 'bg-gray-100 text-gray-700',
                                    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200'
                                };
                                const Icon = meta.icon;

                                const subtotalLiters = items.reduce((sum, item) => {
                                    return sum + parseLiters(item.volume, item.quantity);
                                }, 0);
                                const previousVolume = groupedItems[groupIndex - 1]?.volumeLabel;
                                const showVolumeHeading = volumeLabel && volumeLabel !== previousVolume;

                                return (
                                    <div key={key} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                                        {showVolumeHeading && (
                                            <div className="mb-2 text-base font-bold text-slate-900">{volumeLabel}</div>
                                        )}
                                        <div className={`mb-1.5 flex items-center gap-2 rounded-md px-3 py-1.5 font-semibold ${meta.headerClass}`}>
                                            <Icon className="w-4 h-4" />
                                            <span>{category}</span>
                                            <span className="opacity-80 text-sm">({items.length})</span>
                                        </div>

                                        <div className="space-y-1">
                                            {items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-blue-50"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <span className={`px-2 py-0.5 text-sm font-semibold rounded-md border ${meta.badgeClass}`}>
                                                            {item.quantity}x {formatVolumeLabel(item.volume, category)}
                                                        </span>
                                                        <span className="text-gray-900 truncate">{item.product.name}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {subtotalLiters > 0 && (
                                            <div className="mt-2 text-sm text-gray-600 text-right">
                                                Mezisoučet: <span className="font-semibold text-gray-800">{Math.round(subtotalLiters * 10) / 10}L</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Interní poznámka je určená výhradně pro administraci. */}
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <LockKeyhole className="h-4 w-4 text-amber-700" />
                                <h2 className="font-bold text-amber-950">Interní poznámka</h2>
                                {isInternalNoteDirty && <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">Neuloženo</span>}
                            </div>
                            <span className="text-xs text-amber-800">Zákazník ji nikdy neuvidí</span>
                        </div>
                        <textarea
                            value={internalNote}
                            onChange={(event) => setInternalNote(event.target.value)}
                            disabled={isLoadingInternalNote || isSavingInternalNote}
                            maxLength={5000}
                            rows={3}
                            placeholder="Např. volat před závozem, připravit PET, čeká na platbu..."
                            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                            <span className="text-xs text-amber-900">{internalNote.length}/5000</span>
                            <div className="flex items-center gap-2">
                                {savedInternalNote && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteInternalNote}
                                        disabled={isLoadingInternalNote || isSavingInternalNote}
                                        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Odstranit poznámku
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleSaveInternalNote}
                                    disabled={isLoadingInternalNote || isSavingInternalNote || !isInternalNoteDirty}
                                    className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-amber-300"
                                >
                                    {isSavingInternalNote ? 'Ukládám...' : 'Uložit interní poznámku'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tlačítko pro smazání objednávky */}
                    <div className="mt-5 border-t border-red-100 pt-4">
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                            disabled={isDeleting}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Smazat objednávku
                        </button>
                        <p className="mt-2 text-sm text-slate-500">
                            Tato akce je nevratná a smaže objednávku včetně všech položek.
                        </p>
                    </div>
                </div>
            </div>

            {/* Potvrzovací dialog pro smazání */}
            <DeleteConfirmationDialog />
        </div>
    );
};

export default withAdminAuth(OrderDetailPage);
