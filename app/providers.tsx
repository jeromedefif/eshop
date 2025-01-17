'use client'

import { AuthProvider } from "./contexts/AuthContext"
import { useState, useEffect } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return <AuthProvider>{children}</AuthProvider>
}
