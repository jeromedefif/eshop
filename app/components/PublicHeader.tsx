'use client';
import HeaderVariant from './header/HeaderVariant';
import LegacyPublicHeader from './header/LegacyPublicHeader';
import ModernPublicHeader from './header/ModernPublicHeader';
export type PublicHeaderProps = { active?: 'catalog' | 'login' | 'register' };
export default function PublicHeader(props: PublicHeaderProps) {
    return <HeaderVariant legacy={<LegacyPublicHeader {...props} />} modern={<ModernPublicHeader {...props} />} />;
}
