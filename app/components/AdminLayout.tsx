'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Package, FileText, Users, LogOut, Home } from 'lucide-react';
import Link from 'next/link';

interface AdminLayoutProps {
   children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
   const { isAdmin, signOut } = useAuth();
   const router = useRouter();

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

   return (
       <div className="min-h-screen bg-gray-100">
           <div className="bg-white shadow-sm">
               <div className="max-w-7xl mx-auto px-4">
                   <div className="flex justify-between h-16">
                       <div className="flex items-center">
                           <span className="text-xl font-bold text-gray-900">Administrace</span>
                       </div>
                       <div className="flex items-center space-x-4">
                           <Link
                               href="/"
                               className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                           >
                               <Home className="w-5 h-5 mr-1" />
                               Zpět na e-shop
                           </Link>
                           <button
                               onClick={() => signOut()}
                               className="flex items-center text-gray-700 hover:text-gray-900"
                           >
                               <LogOut className="w-5 h-5 mr-2" />
                               Odhlásit
                           </button>
                       </div>
                   </div>
               </div>
           </div>

           <div className="max-w-7xl mx-auto px-4 py-6">
               <div className="flex gap-6">
                   <div className="w-64">
                       <nav className="bg-white shadow rounded-lg p-4">
                           <ul className="space-y-2">
                               {menuItems.map((item) => (
                                   <li key={item.href}>
                                       <Link
                                           href={item.href}
                                           className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg
                                                    hover:text-blue-600 transition-colors group"
                                       >
                                           <item.icon className="w-5 h-5 mr-3 group-hover:text-blue-600" />
                                           {item.label}
                                       </Link>
                                   </li>
                               ))}
                           </ul>
                       </nav>
                   </div>

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
