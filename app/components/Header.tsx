'use client';
import HeaderVariant from './header/HeaderVariant';
import LegacyHeader from './header/LegacyHeader';
import ModernHeader from './header/ModernHeader';
export default function Header() {
    return <HeaderVariant legacy={<LegacyHeader />} modern={<ModernHeader />} />;
}
