import React from 'react';

export const metadata = {
  title: 'Přihlášení | VINARIA s.r.o.',
  description: 'Přihlášení do vašeho účtu',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
