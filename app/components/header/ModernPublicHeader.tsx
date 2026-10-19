'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogIn, UserPlus, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { PublicHeaderProps } from '../PublicHeader';
import { HeaderBrand, HeaderFrame } from './HeaderChrome';
import styles from './header.module.css';
export default function ModernPublicHeader({ active = 'catalog' }: PublicHeaderProps) {
    const [isGuest, setIsGuest] = useState<boolean | null>(null);
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setIsGuest(!session?.user));
        return () => subscription.unsubscribe();
    }, []);
    return <HeaderFrame><div className={`${styles.container} ${styles.main}`}>
        <HeaderBrand href="/produkty" />
        <nav className={styles.publicNav} aria-label="Veřejná navigace">
            <Link href="/produkty" aria-current={active === 'catalog' ? 'page' : undefined}>Sortiment</Link>
            <a href="https://vinaria.cz/">O společnosti</a>
            <a href="/help/ordering-v1/guide.html">Jak objednávat</a>
        </nav>
        <div className={styles.actions}>
            {isGuest === false ? <Link href="/" className={styles.register}>Objednávkový katalog<ArrowRight size={17} aria-hidden="true" /></Link> : <>
                <Link href="/login" className={styles.quiet} aria-label="Přihlásit" aria-current={active === 'login' ? 'page' : undefined}><LogIn size={18} aria-hidden="true" /><span className={styles.guestLabel}>Přihlásit</span></Link>
                {isGuest && <Link href="/register" className={styles.register} aria-label="Registrace" aria-current={active === 'register' ? 'page' : undefined}><UserPlus size={18} aria-hidden="true" /><span className={styles.guestLabel}>Registrace</span></Link>}
            </>}
        </div>
    </div></HeaderFrame>;
}
