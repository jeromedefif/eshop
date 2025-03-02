'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Package, FileText, Users, LogOut, Home, Menu, X, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface AdminLayoutProps {
   children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
   const { isAdmin, signOut } = useAuth();
   const router = useRouter();
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
   const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

   React.useEffect(() => {
       if (!isAdmin) {
           router.push('/');
       }
   }, [isAdmin, router]);

   if (!isAdmin) {
       return (
           <div className="min-h-screen flex items-center justify-center bg-gray-100">
               <div className="text-center">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4 inline-block"></div>
                   <p className="text-gray-900">Ověřování přístupu...</p>
               </div>
           </div>
       );
   }

   const menuItems = [
       { icon: Package, label: 'Produkty', href: '/admin/products' },
       { icon: FileText, label: 'Objednávky', href: '/admin/orders' },
       { icon: Users, label: 'Uživatelé', href: '/admin/users' }
   ];

   const toggleMobileMenu = () => {
       setMobileMenuOpen(!mobileMenuOpen);
   };

   const toggleDropdown = (name: string) => {
       setActiveDropdown(activeDropdown === name ? null : name);
   };

   return (
       <div className="min-h-screen bg-gray-100">
           {/* Hlavička */}
           <div className="bg-white shadow-sm sticky top-0 z-10">
               <div className="max-w-7xl mx-auto px-4">
                   <div className="flex justify-between h-16">
                       <div className="flex items-center">
                           <span className="text-xl font-bold text-gray-900">Administrace</span>

                           {/* Mobilní menu tlačítko */}
                           <button
                               onClick={toggleMobileMenu}
                               className="ml-4 md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
                           >
                               {mobileMenuOpen ? (
                                  <X className="h-6 w-6" aria-hidden="true" />
                               ) : (
                                  <Menu className="h-6 w-6" aria-hidden="true" />
                               )}
                           </button>
                       </div>
                       <div className="flex items-center space-x-4">
                           <Link
                               href="/"
                               className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                           >
                               <Home className="w-5 h-5 mr-1" />
                               <span className="hidden sm:inline">Zpět na katalog</span>
                           </Link>
                           <button
                               onClick={() => signOut()}
                               className="flex items-center text-gray-700 hover:text-gray-900"
                           >
                               <LogOut className="w-5 h-5 mr-2" />
                               <span className="hidden sm:inline">Odhlásit</span>
                           </button>
                       </div>
                   </div>
               </div>
           </div>

           {/* Mobilní menu - zobrazeno pouze na mobilech a když je otevřené */}
           {mobileMenuOpen && (
               <div className="md:hidden bg-white shadow-md border-b">
                   <div className="px-2 pt-2 pb-3 space-y-1">
                       {menuItems.map((item) => (
                           <Link
                               key={item.href}
                               href={item.href}
                               className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                               onClick={() => setMobileMenuOpen(false)}
                           >
                               <item.icon className="inline-block h-5 w-5 mr-2" />
                               {item.label}
                           </Link>
                       ))}
                   </div>
               </div>
           )}

           {/* Mobilní rozbalovací menu pro tablet a menší desktopy */}
           <div className="hidden md:block lg:hidden bg-white shadow-sm mb-4">
               <div className="max-w-7xl mx-auto px-4 py-3">
                   <div className="relative inline-block text-left w-full">
                       <button
                           onClick={() => toggleDropdown('adminMenu')}
                           className="w-full flex items-center justify-between px-4 py-2 bg-white text-gray-800 border rounded-md hover:bg-gray-50 focus:outline-none"
                       >
                           <span className="font-medium">Menu administrace</span>
                           <ChevronDown className="h-5 w-5" />
                       </button>

                       {activeDropdown === 'adminMenu' && (
                           <div className="absolute left-0 mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                               <div className="py-1">
                                   {menuItems.map((item) => (
                                       <Link
                                           key={item.href}
                                           href={item.href}
                                           className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                                           onClick={() => setActiveDropdown(null)}
                                       >
                                           <item.icon className="inline-block h-5 w-5 mr-2" />
                                           {item.label}
                                       </Link>
                                   ))}
                               </div>
                           </div>
                       )}
                   </div>
               </div>
           </div>

           <div className="max-w-7xl mx-auto px-4 py-6">
               <div className="flex gap-6">
                   {/* Desktop boční menu - zobrazeno pouze na velkých obrazovkách */}
                   <div className="hidden lg:block w-64">
                       <nav className="bg-white shadow rounded-lg p-4">
                           <ul className="space-y-2">
                               {menuItems.map((item) => (
                                   <li key={item.href}>
                                       <Link
                                           href={item.href}
                                           className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg
                                                    hover:text-blue-600 transition-colors"
                                       >
                                           <item.icon className="w-5 h-5 mr-3 text-gray-500" />
                                           {item.label}
                                       </Link>
                                   </li>
                               ))}
                           </ul>
                       </nav>
                   </div>

                   {/* Hlavní obsah */}
                   <div className="flex-1">
                       <div className="bg-white shadow rounded-lg p-6">
                           {children}
                       </div>
                   </div>
               </div>
           </div>
       </div>
   );
}
