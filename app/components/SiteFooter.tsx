import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone } from 'lucide-react';
import { SITE_CONTAINER_CLASS } from '@/lib/layout-classes';
import styles from './SiteFooter.module.css';

export default function SiteFooter() {
    return (
        <footer className={styles.footer}>
            <Image src="/brand/logo-vinaria.png" alt="" aria-hidden="true" width={520} height={520} sizes="520px" className={styles.watermark} />
            <div className={`${SITE_CONTAINER_CLASS} ${styles.grid}`}>
                <div>
                    <div className={styles.brand}>
                        <Image src="/brand/logo-vinaria.png" alt="" width={62} height={62} sizes="62px" />
                        <div><p>VINARIA s.r.o.</p><span>Váš partner pro vína a nápoje.</span></div>
                    </div>
                    <p className={styles.description}>Velkoobchodní objednávkový portál.<br />Víno a nápoje plníme podle vašich objednávek, v objemech, které potřebujete.</p>
                </div>
                <nav aria-label="Navigace v patičce">
                    <h2>Vše na jednom místě</h2>
                    <div className={styles.links}>
                        <Link href="/">Objednávkový katalog</Link>
                        <Link href="/login">Přihlášení</Link>
                        <Link href="/produkty">Veřejný katalog</Link>
                        <Link href="/register">Registrace</Link>
                        <a href="/help/ordering-v1/guide.html">Jak objednávat</a>
                        <Link href="/forgot-password">Zapomenuté heslo</Link>
                    </div>
                </nav>
                <div>
                    <h2>Váš obchodník</h2>
                    <p className={styles.person}>Ing. Roman Fiala<span>Pomohu vám s výběrem i objednávkou.</span></p>
                    <a href="tel:+420734720994" className={styles.contact}><Phone aria-hidden="true" size={16} />+420 734 720 994</a>
                    <a href="mailto:fiala@vinaria.cz" className={styles.contact}><Mail aria-hidden="true" size={16} />fiala@vinaria.cz</a>
                </div>
            </div>
            <div className={styles.bottom}>
                <div className={SITE_CONTAINER_CLASS}>
                    <span>© {new Date().getFullYear()} VINARIA s.r.o. Všechna práva vyhrazena.</span>
                    <span>Beginy.cz <span className={styles.separator}>/</span> <a href="https://vinaria.cz/">www.vinaria.cz</a></span>
                </div>
            </div>
        </footer>
    );
}
