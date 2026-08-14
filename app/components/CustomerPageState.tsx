'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import SiteFooter from '@/components/SiteFooter';

type CustomerPageStateProps = {
    title: string;
    description?: string;
    children?: ReactNode;
    loading?: boolean;
};

export default function CustomerPageState({
    title,
    description,
    children,
    loading = false
}: CustomerPageStateProps) {
    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Header />
            <main className="flex flex-1 items-start px-4 py-8 sm:py-12">
                <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
                    {loading && (
                        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-600" aria-hidden="true" />
                    )}
                    <h1 className="text-xl font-bold text-slate-950">{title}</h1>
                    {description && (
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
                    )}
                    {children && <div className="mt-5">{children}</div>}
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
