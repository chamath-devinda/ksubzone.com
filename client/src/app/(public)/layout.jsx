// Server Component — intentionally no 'use client' directive.
//
// Rendering this layout on the server guarantees that Googlebot receives the
// full HTML shell (Navbar, skip-link, main wrapper, Footer) on the very first
// HTTP response, without waiting for any client-side auth or site-content API
// call to resolve.
//
// Client-only concerns (maintenance mode gate, analytics, ad provider) are
// delegated to <PublicLayoutClient> which wraps {children} inside.

import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PublicLayoutClient from '@/components/layout/PublicLayoutClient';

export default function PublicLayout({ children }) {
  return (
    <>
      {/* Accessibility: skip-link is rendered in the static HTML shell. */}
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[70] -translate-y-20 rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-950 shadow-xl transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      {/* Navbar is a Server Component — renders immediately for Googlebot. */}
      <Navbar />

      {/*
        PublicLayoutClient wraps children with:
          - Maintenance mode gate
          - Analytics visit logger
          - Ad provider context
          - TopProgressBar / ScrollToTop
      */}
      <PublicLayoutClient>
        <main id="main-content" className="flex-grow" tabIndex={-1}>
          {children}
        </main>
      </PublicLayoutClient>

      {/* Footer is a Server Component — rendered in the static HTML shell. */}
      <Footer />
    </>
  );
}
