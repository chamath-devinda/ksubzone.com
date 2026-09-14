'use client';

import React, { useState, useEffect } from 'react';
import { useAds } from './AdProvider';
import AdSlot from './AdSlot';

export default function StickyAnchorAd({ slotId = 'home_sticky_anchor' }) {
  const { config } = useAds();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const isDev = Boolean(config?.showDevelopmentPlaceholders);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('ksubzone_sticky_ad_dismissed') === 'true') {
        setIsDismissed(true);
      }
    } catch {
      // Ignore sessionStorage exceptions in private browsing modes
    }

    const handleLoaded = (e) => {
      if (e.detail?.slot_id === slotId) {
        setIsLoaded(true);
      }
    };

    const handleFailed = (e) => {
      if (e.detail?.slot_id === slotId) {
        setIsLoaded(false);
      }
    };

    window.addEventListener('ksubzone:ad_slot_loaded', handleLoaded);
    window.addEventListener('ksubzone:ad_slot_failed', handleFailed);

    return () => {
      window.removeEventListener('ksubzone:ad_slot_loaded', handleLoaded);
      window.removeEventListener('ksubzone:ad_slot_failed', handleFailed);
    };
  }, [slotId]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('ksubzone_sticky_ad_dismissed', 'true');
    } catch {
      // Ignore storage errors
    }
  };

  if (isDismissed) return null;

  return (
    <aside
      aria-label="Sticky advertisement"
      className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out pointer-events-none ${
        (isLoaded || isDev) ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="pointer-events-auto relative mx-auto flex w-full max-w-4xl flex-col items-center justify-center bg-luxury-950/95 px-2 py-1 backdrop-blur-md border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.85)]">
        <button
          onClick={handleDismiss}
          type="button"
          aria-label="Close advertisement"
          title="Close advertisement"
          className="absolute -top-7 right-3 flex h-7 items-center gap-1 rounded-t-lg border-t border-x border-white/15 bg-luxury-900/95 px-2.5 text-[10px] font-bold text-slate-300 hover:text-white transition-colors shadow-md"
        >
          <span className="text-[9px] uppercase tracking-wider text-slate-400">Ad</span>
          <span className="text-xs leading-none">✕</span>
        </button>
        <AdSlot slotId={slotId} className="!min-h-0 !border-0 !bg-transparent !p-0 !max-w-none shadow-none" />
      </div>
    </aside>
  );
}
