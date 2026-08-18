'use client';

import React from 'react';
import { Wrench, Mail, ShieldCheck } from 'lucide-react';
import ParticleBackground from './ParticleBackground';

export default function MaintenanceMode({ message, siteName, contactEmail }) {
  const displayMessage = message || 'We are currently performing scheduled system upgrades to bring you the best experience. We will be back online shortly.';
  const displaySiteName = siteName || 'KSubZone';
  const displayEmail = contactEmail || 'support@ksubzone.com';

  return (
    <div className="min-h-screen bg-luxury-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Restored ambient background particles */}
      <ParticleBackground />

      {/* Premium glowing background spots */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-brand-primary/10 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-pink-500/10 blur-[130px] pointer-events-none z-0" />

      {/* Glassmorphic main card */}
      <div className="max-w-md w-full border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 text-center relative z-10 shadow-2xl flex flex-col items-center gap-6">
        
        {/* Pulsing Alert Icon Block */}
        <div className="h-20 w-20 rounded-[1.25rem] bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center relative shadow-lg mb-2">
          <div className="absolute inset-0 rounded-[1.25rem] bg-brand-primary/20 animate-ping opacity-40" />
          <Wrench className="w-10 h-10 text-brand-primary animate-pulse relative z-10" />
        </div>

        {/* Brand Headers */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.38em] text-brand-primary mb-2">
            System Offline
          </p>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">
            {displaySiteName}
          </h1>
        </div>

        {/* Maintenance Message */}
        <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
          {displayMessage}
        </p>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />

        {/* Support Mail link */}
        <a 
          href={`mailto:${displayEmail}`}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-white transition duration-300 group"
        >
          <Mail className="w-4 h-4 text-brand-primary group-hover:scale-110 transition duration-300" />
          <span>{displayEmail}</span>
        </a>

        {/* Administrator Portal Bypass */}
        <a 
          href="/management/login"
          className="mt-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 hover:text-brand-primary transition duration-300"
        >
          Staff Portal Login &rarr;
        </a>
      </div>
    </div>
  );
}
