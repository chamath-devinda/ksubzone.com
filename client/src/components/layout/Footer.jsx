'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Film,
  Tv,
  Clapperboard,
  Sparkles,
  BookOpen,
  Info,
  Mail,
  MapPin,
  ArrowUp,
  Facebook,
  HelpCircle,
} from 'lucide-react';
import { useSiteContent } from '@/hooks/useSiteContent';
import AdSlot from '@/components/ads/AdSlot';
import { useAds } from '@/components/ads/AdProvider';

function TikTokIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
    </svg>
  );
}

const socialConfigs = {
  facebook: {
    label: 'Facebook',
    Icon: Facebook,
    color: '#1877F2',
    hoverClass: 'hover:border-[#1877F2]/70 hover:bg-[#1877F2]/15 hover:text-[#1877F2] hover:shadow-[0_0_20px_rgba(24,119,242,0.45)]',
  },
  tiktok: {
    label: 'TikTok',
    Icon: TikTokIcon,
    color: '#ff0050',
    hoverClass: 'hover:border-[#ff0050]/70 hover:bg-[#ff0050]/15 hover:text-[#ff0050] hover:shadow-[0_0_20px_rgba(255,0,80,0.45)]',
  },
};

const DEFAULT_SOCIALS = [
  { label: 'Facebook', url: 'https://www.facebook.com/share/19QzghDCgM/' },
  { label: 'TikTok', url: 'https://www.tiktok.com/@ksubzone_?_r=1&_t=ZS-99ccFoE843h' },
];

export default function Footer() {
  const pathname = usePathname();
  const { content } = useSiteContent();
  const { pageType } = useAds();
  const hideFooter = pathname?.startsWith('/management') || pathname?.includes('/episode-');
  const brand = content?.brand || {};
  const footer = content?.footer || {};

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Clean, focused navigation links for users without clutter or duplicates
  const browseLinks = [
    { label: 'Korean Dramas', url: '/dramas', icon: Tv },
    { label: 'Korean Movies', url: '/movies', icon: Film },
    { label: 'Genre Directory', url: '/genres', icon: Clapperboard },
    { label: 'Trending Titles', url: '/search?category=all&trending=true&sort=views', icon: Sparkles },
  ];

  const communityLinks = [
    { label: 'Articles & Guides', url: '/articles', icon: BookOpen },
    { label: 'Request Subtitle', url: '/contact?subject=request', icon: HelpCircle },
    { label: 'About Us', url: '/about', icon: Info },
    { label: 'Contact Us', url: '/contact', icon: Mail },
  ];

  // Only Facebook and TikTok as requested
  const socialList = [
    { label: 'Facebook', url: 'https://www.facebook.com/share/19QzghDCgM/' },
    { label: 'TikTok', url: 'https://www.tiktok.com/@ksubzone_?_r=1&_t=ZS-99ccFoE843h' },
  ];

  if (hideFooter) return null;

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.08] bg-[#09090B] text-slate-300">
      {/* Top radiant gradient line and ambient backdrop glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-primary/80 to-transparent" />
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-48 bg-brand-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 translate-x-1/2 w-96 h-48 bg-brand-secondary/5 blur-[100px] pointer-events-none" />

      {['home', 'movie', 'drama', 'article', 'listing'].includes(pageType) && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <AdSlot slotId="site_footer_banner" />
        </div>
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12 sm:pt-16 sm:pb-14">
        {/* 4-Column Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 text-left">
          
          {/* Column 1: Brand & Identity (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-5">
            <Link
              href="/"
              className="inline-flex min-w-0 items-center gap-3.5 group"
              aria-label={brand.siteName || 'KSubZone'}
            >
              {/* Dedicated Footer Logo provided by user */}
              <img
                src="/footer-logo.png"
                alt={brand.siteName || 'KSubZone'}
                className="h-11 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_18px_rgba(138,43,226,0.35)]"
              />
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-black tracking-wider text-white font-display leading-tight">
                  KSUB<span className="text-brand-primary">ZONE</span>
                </span>
                <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                  Korean Entertainment
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-400 max-w-sm">
              {footer.description || 'Sri Lanka’s premier platform for synchronized Korean Drama and Movie Sinhala subtitles (SRT, VTT, ASS). Fast, free, and community-powered.'}
            </p>

            {/* Feature Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-[10px] font-bold text-brand-primary-light backdrop-blur-sm">
                Sinhala Subtitles
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-semibold text-slate-300 backdrop-blur-sm">
                K-Drama Hub
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-semibold text-slate-300 backdrop-blur-sm">
                Korean Movies
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-semibold text-slate-300 backdrop-blur-sm">
                SRT Downloads
              </span>
            </div>

            {/* Social Communities */}
            <div className="pt-2">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
                {footer.followTitle || 'Connect With Us'}
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                {socialList.map(({ label, url }) => {
                  const key = label?.toLowerCase() || '';
                  const conf = socialConfigs[key] || {
                    label,
                    Icon: Send,
                    hoverClass: 'hover:border-brand-primary/60 hover:bg-brand-primary/15 hover:text-white hover:shadow-[0_0_16px_rgba(139,92,246,0.4)]',
                  };
                  const Icon = conf.Icon;
                  return (
                    <a
                      key={label}
                      href={url}
                      aria-label={label}
                      title={`Follow KSubZone on ${label}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer shadow-md ${conf.hoverClass}`}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 2: Browse Content (lg:col-span-2) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Browse
              <span className="mt-2 block h-0.5 w-6 rounded-full bg-brand-primary" />
            </h3>
            <nav className="flex flex-col gap-3 text-xs sm:text-sm text-slate-400">
              {browseLinks.map((link) => (
                <Link
                  key={link.url}
                  href={link.url}
                  className="group inline-flex items-center gap-2 transition-all duration-150 hover:text-white hover:translate-x-1"
                >
                  <span className="h-1 w-1 rounded-full bg-slate-600 transition-colors duration-150 group-hover:bg-brand-primary group-hover:scale-125" />
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 3: Platform & Community (lg:col-span-2) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Platform
              <span className="mt-2 block h-0.5 w-6 rounded-full bg-brand-secondary" />
            </h3>
            <nav className="flex flex-col gap-3 text-xs sm:text-sm text-slate-400">
              {communityLinks.map((link) => (
                <Link
                  key={link.url}
                  href={link.url}
                  className="group inline-flex items-center gap-2 transition-all duration-150 hover:text-white hover:translate-x-1"
                >
                  <span className="h-1 w-1 rounded-full bg-slate-600 transition-colors duration-150 group-hover:bg-brand-secondary group-hover:scale-125" />
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 4: Contact & TMDB Attribution (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Contact Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                {footer.contactTitle || 'Contact & Support'}
                <span className="mt-2 block h-0.5 w-6 rounded-full bg-brand-accent" />
              </h3>

              <div className="space-y-2.5 text-xs sm:text-sm text-slate-400">
                <p className="flex items-start gap-2.5 leading-relaxed">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-accent" />
                  <span>{footer.contactText || 'Seoul-curated Korean entertainment catalog for global fans.'}</span>
                </p>
                <a
                  href={`mailto:${footer.email || 'contact@ksubzone.com'}`}
                  className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-slate-200 transition-all duration-200 hover:border-brand-primary/50 hover:bg-brand-primary/10 hover:text-white break-all group"
                >
                  <Mail className="h-4 w-4 flex-shrink-0 text-brand-primary transition-transform group-hover:scale-110" />
                  <span className="font-mono text-xs">{footer.email || 'contact@ksubzone.com'}</span>
                </a>
              </div>
            </div>

            {/* TMDB Official Attribution Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-xl shadow-lg transition-colors hover:border-white/[0.14] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-gradient-to-r from-[#01b4e4] to-[#90cea1] text-slate-950 font-black text-[11px] tracking-wider shadow-[0_0_12px_rgba(1,180,228,0.3)]">
                    TMDB
                  </div>
                  <span className="text-[11px] font-semibold text-slate-300">The Movie Database</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">API Partner</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                This product uses the TMDB API but is not endorsed or certified by TMDB.
              </p>
            </div>

            {/* Subtitle Community Notice */}
            <p className="text-[11px] leading-relaxed text-slate-500 italic">
              Subtitles on KSubZone are community-contributed for educational and fan purposes.
            </p>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Back to Top */}
        <div className="mt-12 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-xs text-slate-400" suppressHydrationWarning>
            © {new Date().getFullYear()} <span className="font-semibold text-slate-200">{brand.siteName || 'KSubZone'}</span>. All Rights Reserved.
          </p>

          <div className="flex items-center gap-4">
            <p className="text-xs text-slate-400">
              Developed by{' '}
              <span className="font-semibold text-brand-primary-light">
                C² Digital Creations
              </span>
            </p>

            <button
              onClick={scrollToTop}
              type="button"
              title="Back to Top"
              aria-label="Back to Top"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition-all hover:border-brand-primary/60 hover:bg-brand-primary/20 hover:text-white hover:-translate-y-0.5 shadow-sm"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

