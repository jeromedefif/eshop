'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, CircleHelp, List, LogOut, Package, RotateCcw, ShoppingCart, User, UserCog, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useQuickReorder } from '@/hooks/useQuickReorder';
import { checkoutAccessoryTotals } from '@/lib/orders/checkout-totals';
import { HeaderBrand, HeaderDropdown, HeaderFrame } from './HeaderChrome';
import styles from './header.module.css';

export default function ModernHeader() {
    const pathname = usePathname();
    const { user, profile, signOut, isLoading } = useAuth();
    const cart = useCart();
    const quickReorder = useQuickReorder();
    const [signingOut, setSigningOut] = useState(false);
    const [reordering, setReordering] = useState(false);
    const displayName = profile?.full_name || user?.email || 'Můj účet';
    const initials = (profile?.full_name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    const entries = Object.entries(cart.cartItems).filter(([, quantity]) => quantity > 0);
    const hasItems = entries.length > 0;
    const { petPackages, gasPieces } = checkoutAccessoryTotals(entries.map(([key, quantity]) => {
        const [productId, volume] = key.split('-');
        return { productId: Number(productId), volume, quantity, productName: '', display: '' };
    }), cart.products);
    const ready = cart.isCartHydrated && !cart.isProductsLoading;
    const volumeText = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 2 }).format(cart.totalVolume);
    const compactTotal = !ready ? 'Načítání…' : !hasItems ? 'Košík' : cart.totalVolume > 0 ? `${volumeText} l` : petPackages > 0 ? `PET ${petPackages} bal.` : gasPieces > 0 ? `Plyn ${gasPieces} ks` : `${entries.length} pol.`;
    const summary = `${volumeText} litrů · PET ${petPackages} balení · Plyn ${gasPieces} ks`;
    const inCheckout = pathname === '/order-summary' || pathname === '/order-confirmation';
    const catalogActive = pathname === '/' || pathname.startsWith('/produkty');
    const historyActive = pathname === '/my-orders' || pathname.startsWith('/my-orders/');
    const reorder = async () => { if (reordering) return; setReordering(true); try { await quickReorder(); } finally { setReordering(false); } };
    const logout = async () => { if (signingOut) return; setSigningOut(true); try { await signOut(); } catch (error) { console.error('Error signing out:', error); } finally { setSigningOut(false); } };

    const help = <>
        <h2 className={styles.menuTitle}>Pomůžeme vám s objednávkou</h2>
        <p className={styles.helpText}>Pro rozvoz objednávejte do úterý 13:00. Pozdější objednávky konzultujte s obchodním zástupcem.</p>
        <button type="button" className={styles.menuItem} onClick={() => {
            const url = new URL(pathname === '/' ? window.location.href : '/', window.location.origin);
            url.searchParams.set('pruvodce', '1');
            window.location.assign(url.toString());
        }}><CircleHelp size={17} aria-hidden="true" />Jak objednávat</button>
        <a href="/help/ordering-v1/guide.html" className={styles.menuItem}>Obrázkový návod</a>
        <div className={styles.divider} />
        <a href="tel:+420734720994" className={styles.menuItem}>Roman Fiala · 734 720 994</a>
        <a href="mailto:fiala@vinaria.cz" className={styles.menuItem}>fiala@vinaria.cz</a>
    </>;
    const catalogLink = <Link href="/" aria-current={catalogActive ? 'page' : undefined} className={styles.navLink}><List size={17} aria-hidden="true" />Katalog</Link>;
    const ordersLink = <Link href="/my-orders" data-catalog-guide="my-orders" aria-current={historyActive ? 'page' : undefined} className={styles.navLink}><Package size={17} aria-hidden="true" />Moje objednávky</Link>;

    return <>
        <HeaderFrame>
            <div className={`${styles.container} ${styles.main}`}>
                <HeaderBrand />
                <nav className={styles.nav} aria-label="Hlavní navigace">{catalogLink}{user && ordersLink}</nav>
                <div className={styles.actions}>
                    {user ? <>
                        <div className={styles.helpDesktop}><HeaderDropdown label="Nápověda" icon={<CircleHelp aria-hidden="true" size={17} />} compactLabel>{help}</HeaderDropdown></div>
                        <HeaderDropdown label="Můj účet" icon={<span className={styles.avatar}>{initials || <User size={16} aria-hidden="true" />}</span>}>
                            <p className={styles.menuTitle}>{displayName}</p>
                            <Link href="/my-profile" className={styles.menuItem}><User size={17} aria-hidden="true" />Profil a dodací údaje</Link>
                            <Link href="/my-orders" className={styles.menuItem}><Package size={17} aria-hidden="true" />Moje objednávky a šablony</Link>
                            <button type="button" onClick={() => void reorder()} disabled={reordering} className={styles.menuItem}><RotateCcw size={17} aria-hidden="true" className={reordering ? 'animate-spin' : undefined} />{reordering ? 'Načítám…' : 'Objednat poslední'}</button>
                            {profile?.is_admin && <><div className={styles.divider} /><Link href="/admin/orders" className={styles.menuItem}><UserCog size={17} aria-hidden="true" />Administrace</Link></>}
                            <div className={styles.divider} />
                            <button type="button" onClick={() => void logout()} disabled={signingOut} className={styles.menuItem}><LogOut size={17} aria-hidden="true" />{signingOut ? 'Odhlašuji…' : 'Odhlásit'}</button>
                        </HeaderDropdown>
                    </> : !isLoading && <>
                        <Link href="/login" aria-label="Přihlásit" className={styles.quiet}><User size={18} aria-hidden="true" /><span className={styles.guestLabel}>Přihlásit</span></Link>
                        <Link href="/register" aria-label="Registrace" className={styles.register}><UserPlus size={18} aria-hidden="true" /><span className={styles.guestLabel}>Registrace</span></Link>
                    </>}
                    <Link href="/order-summary" data-catalog-guide="order-summary"
                        aria-current={inCheckout ? 'page' : undefined}
                        aria-label={!ready ? 'Otevřít košík. Načítáme obsah.' : hasItems ? `Otevřít košík. ${summary}` : 'Otevřít prázdný košík'}
                        className={`${styles.orderButton} ${!hasItems ? styles.orderButtonEmpty : ''}`}>
                        <ShoppingCart size={21} aria-hidden="true" />
                        <span><span className={styles.orderTitle}>Košík</span><span className={styles.orderMobile}>Košík</span><span className={styles.orderMobileTotal}>{ready && !hasItems ? 'Prázdný' : compactTotal}</span><span className={styles.orderSmall}>{ready ? hasItems ? summary : 'Začněte výběrem produktů' : 'Načítáme váš výběr…'}</span></span>
                        <ArrowRight className={styles.orderArrow} size={15} aria-hidden="true" />
                    </Link>
                </div>
            </div>
            <nav className={`${styles.container} ${styles.mobileNav}`} aria-label="Mobilní navigace">
                {catalogLink}{user && ordersLink}
                <div className={styles.mobileHelp}><HeaderDropdown label="Nápověda a kontakt" icon={<CircleHelp size={19} aria-hidden="true" />}>{help}</HeaderDropdown></div>
            </nav>
        </HeaderFrame>
    </>;
}
