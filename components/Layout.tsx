import Navbar from './Navbar';
import { Toaster } from 'react-hot-toast';
import React, { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 flex flex-col transition-colors duration-500">
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-grow pt-20">
        <div className="bg-graylight dark:bg-gray-950 text-graydark dark:text-gray-100 p-6 sm:p-10 transition-colors duration-500">
          <div className="max-w-[1600px] mx-auto animate-fade-in">
            {children}
          </div>
        </div>
      </main>

      {/* Modern Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 py-8 transition-colors duration-500">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <img src="/img/padtec_small.png" alt="Padtec Logo" className="h-5 opacity-40 invert dark:invert-0" />
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Network Monitoring System
            </p>
          </div>
          <p className="text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} Inter · Todos los derechos reservados
          </p>
        </div>
      </footer>

      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'rounded-2xl font-bold bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xl border border-gray-100 dark:border-gray-700',
          duration: 4000,
        }}
      />
    </div>
  );
}

export { Layout };
