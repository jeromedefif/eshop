import React from 'react';

export const metadata = {
  title: 'Potvrzení objednávky | VINARIA s.r.o.',
  description: 'Dokončení a potvrzení vaší objednávky',
}

export default function OrderConfirmationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
