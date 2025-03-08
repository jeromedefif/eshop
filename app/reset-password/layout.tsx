import React from 'react';

export const metadata = {
  title: 'Reset hesla | VINARIA s.r.o.',
  description: 'Nastavení nového hesla k vašemu účtu',
}

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
