import React from 'react';

export const metadata = {
  title: 'Můj profil | VINARIA s.r.o.',
  description: 'Správa vašeho uživatelského profilu',
}

export default function MyProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
