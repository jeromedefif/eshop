'use client'

import { AuthProvider } from "./contexts/AuthContext"
import { CartProvider } from "./page"
import { useState, useEffect } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

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

  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <ToastContainer position="top-center" autoClose={5000} hideProgressBar={false} />
      </CartProvider>
    </AuthProvider>
  )
}
