import React from 'react';

export const metadata = {
  title: 'Přihlášení po změně hesla | VINARIA s.r.o.',
  description: 'Přihlášení s novým heslem',
}

export default function LoginAfterResetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
