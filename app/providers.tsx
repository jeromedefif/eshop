'use client'

import { AuthProvider } from "./contexts/AuthContext"
import { CartProvider } from "./contexts/CartContext"
import { PurchasingProvider } from "./contexts/PurchasingContext"
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(false)
  }, [])

  // Veřejné produktové stránky jsou samostatné SEO stránky. Nepotřebují
  // autentizaci ani košík, takže při jejich návštěvě nevytváříme Supabase dotazy.
  if (pathname === '/produkty' || pathname.startsWith('/produkty/')) {
    return children
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-xl text-center">
          <div className="mx-auto animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <h1 className="mt-5 text-xl font-semibold text-slate-900">
            Načítáme velkoobchodní katalog vín a nápojů
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Připravujeme aktuální nabídku produktů společnosti VINARIA s.r.o., dostupné objemy a možnosti objednání.
          </p>
        </div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <CartProvider>
        <PurchasingProvider>
          {children}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </PurchasingProvider>
      </CartProvider>
    </AuthProvider>
  )
}
