'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function ModalDrawer({
  isOpen,
  onClose,
  title,
  children,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  maxHeightClass = 'max-h-[85vh]'
}) {
  // Lock background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            // Mobile: Slide up from bottom. Desktop: Zoom & Fade.
            initial={{ 
              y: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 0, 
              scale: typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 0.95,
              opacity: typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 0 
            }}
            animate={{ 
              y: 0, 
              scale: 1, 
              opacity: 1 
            }}
            exit={{ 
              y: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 0, 
              scale: typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 0.95, 
              opacity: typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 0 
            }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className={`w-full bg-luxury-900 border border-white/10 shadow-2xl relative overflow-hidden z-10 flex flex-col
              /* Mobile Styles */
              fixed bottom-0 inset-x-0 rounded-t-3xl max-h-[92vh] border-b-0
              /* Desktop Styles */
              md:relative md:bottom-auto md:inset-x-auto md:rounded-2xl ${maxHeightClass} ${sizeClasses[size] || sizeClasses.md}
            `}
          >
            {/* Grab handle bar on mobile */}
            <div className="w-full flex justify-center py-2 md:hidden">
              <div className="w-12 h-1 bg-white/10 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-luxury-950/40 flex-shrink-0">
              <h3 className="text-sm font-black text-white uppercase tracking-wider truncate mr-4">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition p-1.5 hover:bg-white/5 rounded-xl flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
