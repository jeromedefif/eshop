// app/reset-password/layout.tsx
import React from 'react';

export const metadata = {
  title: 'Resetování hesla | VINARIA s.r.o.',
  description: 'Nastavení nového hesla k vašemu účtu',
}

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
