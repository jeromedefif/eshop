import React from 'react';

export const metadata = {
  title: 'Moje objednávky | VINARIA s.r.o.',
  description: 'Přehled vašich objednávek',
  alternates: {
    languages: {
      'cs-CZ': '/my-orders',
    },
  },
  other: {
    'Content-Language': 'cs',
  },
}

export default function MyOrdersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}
