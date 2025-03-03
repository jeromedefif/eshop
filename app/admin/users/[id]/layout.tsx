// app/admin/users/[id]/layout.tsx

import React from 'react';

export const metadata = {
  title: 'Detail uživatele | VINARIA s.r.o. Admin',
  description: 'Detail a správa uživatelského účtu',
}

export default function UserDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
