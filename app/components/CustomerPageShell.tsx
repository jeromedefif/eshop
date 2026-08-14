import type { ReactNode } from 'react';
import Header from '@/components/Header';
import SiteFooter from '@/components/SiteFooter';

type CustomerPageShellProps = {
    children: ReactNode;
    width?: '3xl' | '5xl' | '7xl';
    mainClassName?: string;
};

const widthClasses = {
    '3xl': 'max-w-3xl',
    '5xl': 'max-w-5xl',
    '7xl': 'max-w-7xl'
};

export default function CustomerPageShell({
    children,
    width = '5xl',
    mainClassName = ''
}: CustomerPageShellProps) {
    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Header />
            <main className={`flex-1 px-4 py-8 sm:px-6 sm:py-10 ${mainClassName}`}>
                <div className={`mx-auto w-full ${widthClasses[width]}`}>
                    {children}
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
