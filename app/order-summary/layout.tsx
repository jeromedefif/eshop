import React from 'react';

export const metadata = {
  title: 'Souhrn objednávky | VINARIA s.r.o.',
  description: 'Přehled a dokončení objednávky',
  alternates: {
    languages: {
      'cs-CZ': '/order-summary',
    },
  },
  other: {
    'Content-Language': 'cs',
  },
}

export default function OrderSummaryLayout({
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
