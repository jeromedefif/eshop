import type { ReactNode } from 'react';
import PublicHeader from '@/components/PublicHeader';
import SiteFooter from '@/components/SiteFooter';

type AuthPageShellProps = {
    children: ReactNode;
    width?: 'md' | 'xl' | '2xl';
    active?: 'login' | 'register';
};

const widthClasses = {
    md: 'max-w-md',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
};

export default function AuthPageShell({
    children,
    width = 'md',
    active = 'login'
}: AuthPageShellProps) {
    return (
        <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_#eff6ff_0,_#f8fafc_38%,_#f1f5f9_100%)] text-slate-900">
            <PublicHeader active={active} />
            <main className="flex-1 px-4 py-8 sm:py-12">
                <div className={`mx-auto w-full ${widthClasses[width]}`}>
                    {children}
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
