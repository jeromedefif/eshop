import React from 'react';

export const metadata = {
  title: 'Detail objednávky | VINARIA s.r.o. Admin',
  description: 'Detail a správa objednávky',
}

export default function OrderDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
