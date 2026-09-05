'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function TopProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  // Complete progress on route change
  useEffect(() => {
    if (visible) {
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Listen to clicks on links across the document
  useEffect(() => {
    const handleDocumentClick = (e) => {
      const target = e.target.closest('a');
      if (!target || !target.href) return;

      const url = new URL(target.href, window.location.href);
      const isExternal = url.origin !== window.location.origin;
      const isSamePageHash = url.pathname === window.location.pathname && url.hash;
      const isBlank = target.target === '_blank';

      if (!isExternal && !isSamePageHash && !isBlank && url.pathname !== window.location.pathname) {
        // Start progress immediately
        setVisible(true);
        setProgress(25);

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 85) {
              clearInterval(timerRef.current);
              return 85;
            }
            return prev + (85 - prev) * 0.15;
          });
        }, 150);
      }
    };

    document.addEventListener('click', handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[2.5px] bg-transparent"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent transition-all duration-200 ease-out shadow-[0_0_12px_rgba(73,5,112,0.8)]"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}

export default function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <TopProgressBarInner />
    </Suspense>
  );
}
