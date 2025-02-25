'use client'

import { AuthProvider } from "./contexts/AuthContext"
import { CartProvider } from "./page"
import { useState, useEffect } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import LanguageMeta from './components/LanguageMeta'
import LanguageScript from './components/LanguageScript'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(false)
  }, [])

  useEffect(() => {
    document.documentElement.lang = 'cs-CZ';
    document.documentElement.setAttribute('translate', 'no');
    document.documentElement.classList.add('notranslate');

    const handleRouteChange = () => {
      document.documentElement.lang = 'cs-CZ';
      document.documentElement.setAttribute('translate', 'no');
      document.documentElement.classList.add('notranslate');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('routeChangeComplete', handleRouteChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('routeChangeComplete', handleRouteChange);
      }
    };
  }, []);

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
        <LanguageMeta />
        <LanguageScript />
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
      </CartProvider>
    </AuthProvider>
  )
}
