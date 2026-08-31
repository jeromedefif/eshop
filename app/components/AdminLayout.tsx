'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Package, FileText, Users, BarChart3, LineChart, LogOut, Home, Menu, X, Activity, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface AdminLayoutProps {
    children: React.ReactNode;
}

const menuItems = [
    { icon: FileText, label: 'Objednávky', href: '/admin/orders' },
    { icon: Package, label: 'Produkty', href: '/admin/products' },
    { icon: Users, label: 'Uživatelé', href: '/admin/users' },
    { icon: LineChart, label: 'Souhrny', href: '/admin/summary' },
    { icon: BarChart3, label: 'Statistiky', href: '/admin/stats' },
    { icon: Activity, label: 'Konverze', href: '/admin/conversions' },
    { icon: Megaphone, label: 'Oznámení', href: '/admin/announcements' }
];

export default function AdminLayout({ children }: AdminLayoutProps) {
    const { isAdmin, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    React.useEffect(() => {
        if (!isAdmin) {
            router.push('/');
        }
    }, [isAdmin, router]);

    if (!isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                    <p className="text-slate-900">Ověřování přístupu...</p>
                </div>
            </div>
        );
    }

    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const navClassName = (href: string) => [
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
        isActive(href)
            ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    ].join(' ');

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
                    <Link href="/admin/orders" className="shrink-0 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Administrace
                    </Link>

                    <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Administrace">
                        {menuItems.map((item) => (
                            <Link key={item.href} href={item.href} className={navClassName(item.href)}>
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-1 sm:gap-3">
                        <Link
                            href="/"
                            className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800 sm:px-3"
                        >
                            <Home className="h-5 w-5" />
                            <span className="hidden xl:inline">Zpět na katalog</span>
                        </Link>
                        <button
                            onClick={() => signOut()}
                            className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:px-3"
                        >
                            <LogOut className="h-5 w-5" />
                            <span className="hidden xl:inline">Odhlásit</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen((open) => !open)}
                            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
                            aria-expanded={mobileMenuOpen}
                            aria-label="Otevřít menu administrace"
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>

                {mobileMenuOpen && (
                    <nav className="border-t border-slate-200 bg-white px-4 py-3 shadow-lg lg:hidden" aria-label="Administrace">
                        <div className="mx-auto grid max-w-[1440px] gap-1 sm:grid-cols-2">
                            {menuItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={navClassName(item.href)}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </nav>
                )}
            </header>

            <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
