'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function ModalDrawer({
  isOpen,
  onClose,
  title,
  children,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
  maxHeightClass = 'max-h-[92vh]',
  footer = null
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
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-6xl',
    '3xl': 'max-w-7xl',
    full: 'max-w-[96vw]'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 lg:p-6">
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ 
              y: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 15, 
              scale: typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 0.98,
              opacity: 0 
            }}
            animate={{ 
              y: 0, 
              scale: 1, 
              opacity: 1 
            }}
            exit={{ 
              y: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 10, 
              scale: typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 0.98, 
              opacity: 0 
            }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`admin-modal-drawer w-full border border-white/[0.08] bg-[#11131A] shadow-2xl relative overflow-hidden z-10 flex flex-col
              /* Mobile Styles */
              fixed bottom-0 inset-x-0 rounded-t-2xl max-h-[94vh] border-b-0
              /* Desktop Styles */
              md:relative md:bottom-auto md:inset-x-auto md:rounded-2xl ${maxHeightClass} ${sizeClasses[size] || sizeClasses.md}
            `}
          >
            {/* Grab handle bar on mobile */}
            <div className="w-full flex justify-center py-2 md:hidden">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#151821]/90 flex-shrink-0">
              <h3 className="text-sm font-bold text-slate-100 tracking-tight truncate mr-4">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white transition p-1.5 hover:bg-white/[0.06] rounded-lg flex-shrink-0"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-grow overflow-y-auto p-5 sm:p-6 md:p-7 space-y-5 admin-custom-scrollbar">
              {children}
            </div>

            {/* Optional Sticky Footer */}
            {footer && (
              <div className="px-6 py-3.5 border-t border-white/[0.06] bg-[#151821]/90 flex-shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
