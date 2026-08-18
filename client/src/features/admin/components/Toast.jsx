'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

function ToastItem({ toast, onClose }) {
  const { message, type = 'success', duration = 4000 } = toast;
  const [remaining, setRemaining] = useState(duration);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 50) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 50;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isHovered, onClose]);

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }[type] || CheckCircle;

  const borderColors = {
    success: 'border-l-emerald-500 border-emerald-500/10',
    error: 'border-l-rose-500 border-rose-500/10',
    warning: 'border-l-amber-500 border-amber-500/10',
    info: 'border-l-blue-500 border-blue-500/10'
  }[type] || 'border-l-emerald-500 border-emerald-500/10';

  const iconColors = {
    success: 'text-emerald-400 bg-emerald-500/10',
    error: 'text-rose-400 bg-rose-500/10',
    warning: 'text-amber-400 bg-amber-500/10',
    info: 'text-blue-400 bg-blue-500/10'
  }[type] || 'text-emerald-400 bg-emerald-500/10';

  const progressColors = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500'
  }[type] || 'bg-emerald-500';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -15, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`pointer-events-auto w-full bg-luxury-900 border border-white/5 border-l-4 rounded-xl p-4 shadow-glass-neon flex gap-3.5 items-start justify-between select-none relative overflow-hidden ${borderColors}`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColors}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      
      <div className="flex-1 min-w-0 pr-2 pt-0.5">
        <p className="text-xs font-bold text-slate-100 leading-relaxed break-words">
          {message}
        </p>
      </div>

      <button
        onClick={onClose}
        className="text-slate-500 hover:text-slate-300 transition p-1 hover:bg-white/5 rounded-lg flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Countdown progress bar */}
      <div 
        className={`absolute bottom-0 left-0 h-0.5 ${progressColors}`}
        style={{ width: `${(remaining / duration) * 100}%`, transition: 'width 50ms linear' }}
      />
    </motion.div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'success', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg, duration) => show(msg, 'success', duration), [show]);
  const error = useCallback((msg, duration) => show(msg, 'error', duration), [show]);
  const warning = useCallback((msg, duration) => show(msg, 'warning', duration), [show]);
  const warn = useCallback((msg, duration) => show(msg, 'warning', duration), [show]);
  const info = useCallback((msg, duration) => show(msg, 'info', duration), [show]);

  return (
    <ToastContext.Provider value={{ show, success, error, warning, warn, info, remove }}>
      {children}
      
      {/* Toast Portal/Overlay Container */}
      <div className="fixed top-4 right-4 left-4 md:left-auto md:top-6 md:right-6 z-[9999] flex flex-col gap-3 w-[calc(100%-2rem)] md:w-full md:max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
