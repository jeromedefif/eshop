// app/forgot-password/layout.tsx
import React from 'react';

export const metadata = {
  title: 'Zapomenuté heslo | VINARIA s.r.o.',
  description: 'Obnovení přístupu k vašemu účtu',
}

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
