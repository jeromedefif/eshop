import React from 'react';

export const metadata = {
  title: 'Registrace úspěšná | VINARIA s.r.o.',
  description: 'Vaše registrace byla úspěšně dokončena',
}

export default function RegisterSuccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
