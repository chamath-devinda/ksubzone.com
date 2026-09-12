'use client';

import React from 'react';

export default function AdsterraReferralBanner({ className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center w-full my-4 px-2 ${className}`}>
      <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1.5">
        Sponsored Partner
      </span>
      <a
        href="https://beta.publishers.adsterra.com/referral/q9CtQ4eXAE"
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="group relative block w-full max-w-[728px] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1 shadow-2xl transition-all duration-300 hover:border-brand-primary/50 hover:shadow-[0_0_25px_rgba(124,58,237,0.25)] hover:scale-[1.01]"
      >
        <img
          src="https://landings-cdn.adsterratech.com/referralBanners/png/728%20x%2090%20px.png"
          alt="Monetize your traffic with Adsterra"
          width={728}
          height={90}
          loading="lazy"
          className="w-full h-auto object-contain rounded-xl block"
        />
      </a>
    </div>
  );
}
