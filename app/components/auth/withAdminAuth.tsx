'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function withAdminAuth<P extends object>(
    WrappedComponent: React.ComponentType<P>
): React.FC<P> {
    return function WithAdminAuthComponent(props: P) {
        const { isAdmin, isLoading, isInitialized } = useAuth();
        const router = useRouter();
        const [shouldRender, setShouldRender] = useState(false);

        useEffect(() => {
            if (!isInitialized) return;

            if (!isLoading && !isAdmin) {
                router.push('/');
            } else if (!isLoading && isAdmin) {
                setShouldRender(true);
            }
        }, [isAdmin, isLoading, router, isInitialized]);

        if (!shouldRender) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4 inline-block"></div>
                        <p className="text-gray-900">Ověřování přístupu...</p>
                    </div>
                </div>
            );
        }

        return <WrappedComponent {...props} />;
    };
}
