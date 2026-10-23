'use client';

import { useEffect, useRef, useState, useId, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import styles from './header.module.css';
import HeaderNotices from './HeaderNotices';

export function HeaderBrand({ href = '/' }: { href?: string }) {
    return <Link href={href} className={styles.brand} aria-label="VINARIA s.r.o. – Beginy.cz">
        <Image src="/brand/logo-vinaria.png" alt="" width={56} height={56} sizes="(max-width: 359px) 36px, (max-width: 1023px) 42px, 56px" className={styles.brandLogo} />
        <span><span className={styles.brandName}>VINARIA s.r.o.</span><span className={styles.brandSubtitle}>Beginy.cz · Objednávky online</span></span>
    </Link>;
}
export function HeaderUtility() {
    return <div className={styles.utility}><div className={styles.container}>
        <HeaderNotices />
        <div className={styles.utilityRight}><span>Plníme podle vaší objednávky</span><a href="tel:+420734720994">Váš obchodník: Ing. Roman Fiala · 734 720 994</a></div>
    </div></div>;
}
export function HeaderFrame({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLElement>(null);
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const previous = document.documentElement.style.getPropertyValue('--beginy-header-height');
        const update = () => document.documentElement.style.setProperty('--beginy-header-height', `${element.getBoundingClientRect().height}px`);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(element);
        return () => {
            observer.disconnect();
            if (previous) document.documentElement.style.setProperty('--beginy-header-height', previous);
            else document.documentElement.style.removeProperty('--beginy-header-height');
        };
    }, []);
    return <header ref={ref} data-modern-header="true" className={styles.header}><HeaderUtility />{children}</header>;
}
export function HeaderDropdown({ label, icon, children, compactLabel = false }: { label: string; icon: ReactNode; children: ReactNode; compactLabel?: boolean }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const id = useId();
    const pathname = usePathname();
    useEffect(() => {
        if (!open) return;
        const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
    }, [open]);
    return <div ref={ref} className={styles.dropdown} key={pathname} onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
        <button ref={trigger} type="button" aria-label={label} aria-expanded={open} aria-controls={id} className={styles.quiet} onClick={() => setOpen(value => !value)}>
            {icon}<span className={compactLabel ? styles.compactLabel : styles.actionLabel}>{label}</span><ChevronDown aria-hidden="true" className={styles.chevron} size={13} />
        </button>
        {open && <div id={id} className={styles.menu} onClick={event => { if ((event.target as Element).closest('a,button')) setOpen(false); }}>{children}</div>}
    </div>;
}
