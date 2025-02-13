'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function withAdminAuth<P extends object>(
    WrappedComponent: React.ComponentType<P>
): React.FC<P> {
    return function WithAdminAuthComponent(props: P) {
        const { isAdmin, isLoading } = useAuth();
        const router = useRouter();

        useEffect(() => {
            if (!isLoading && !isAdmin) {
                router.push('/');
            }
        }, [isAdmin, isLoading, router]);

        if (isLoading) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4 inline-block"></div>
                        <p className="text-gray-900">Ověřování přístupu...</p>
                    </div>
                </div>
            );
        }

        if (!isAdmin) {
            return null;
        }

        return <WrappedComponent {...props} />;
    };
}
