'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Shared customer palette, including dialogs rendered into document.body. */
export default function CustomerBrandTheme({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const customerPage = pathname !== '/admin' && !pathname.startsWith('/admin/');
  return <div data-customer-brand={customerPage ? 'vinaria' : undefined} className="min-h-screen bg-white">{children}</div>;
}
