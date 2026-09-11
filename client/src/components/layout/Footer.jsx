'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clapperboard, Facebook, Instagram, Mail, MapPin, Send, Youtube, ExternalLink } from 'lucide-react';
import { useSiteContent } from '@/hooks/useSiteContent';
import { resolveLogoUrl } from '@/utils/mediaImages';
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
    hoverClass: 'hover:border-[#1877F2]/70 hover:bg-[#1877F2]/15 hover:text-[#1877F2] hover:shadow-[0_0_18px_rgba(24,119,242,0.45)]',
  },
  tiktok: {
    label: 'TikTok',
    Icon: TikTokIcon,
    hoverClass: 'hover:border-[#ff0050]/70 hover:bg-[#ff0050]/15 hover:text-[#ff0050] hover:shadow-[0_0_18px_rgba(255,0,80,0.45)]',
  },
  instagram: {
    label: 'Instagram',
    Icon: Instagram,
    hoverClass: 'hover:border-[#E1306C]/70 hover:bg-[#E1306C]/15 hover:text-[#E1306C] hover:shadow-[0_0_18px_rgba(225,48,108,0.45)]',
  },
  youtube: {
    label: 'YouTube',
    Icon: Youtube,
    hoverClass: 'hover:border-[#FF0000]/70 hover:bg-[#FF0000]/15 hover:text-[#FF0000] hover:shadow-[0_0_18px_rgba(255,0,0,0.45)]',
  }
};

const DEFAULT_SOCIALS = [
  { label: 'Facebook', url: 'https://www.facebook.com/share/19QzghDCgM/' },
  { label: 'TikTok', url: 'https://www.tiktok.com/@ksubzone_?_r=1&_t=ZS-99ccFoE843h' }
];

export default function Footer() {
  const pathname = usePathname();
  const { content } = useSiteContent();
  const { pageType } = useAds();
  const hideFooter = pathname?.startsWith('/management') || pathname?.includes('/episode-');
  const brand = content?.brand || {};
  const footer = content?.footer || {};

  const defaultFooterLinks = [
    { label: 'Home', url: '/' },
    { label: 'Movies', url: '/movies' },
    { label: 'TV Series', url: '/dramas' },
    { label: 'Genre Directory', url: '/genres' },
    { label: 'About Us', url: '/about' },
    { label: 'Contact Us', url: '/contact' },
  ];

  const customFooterLinks = (footer.links || []).filter(
    (link) => link.label && link.url && link.url !== '/articles' && link.url !== '/sitemap' && link.label !== 'Articles & Guides' && link.label !== 'HTML Sitemap'
  );

  const footerLinks = [
    ...customFooterLinks,
    ...defaultFooterLinks.filter((fallback) => !customFooterLinks.some((link) => link.url === fallback.url)),
  ];

  // Resolve active social channels with proper URLs
  const rawSocials = (footer.socials || []).filter((link) => link.label && link.url);
  const socialList = rawSocials.length > 0
    ? rawSocials.map((s) => {
        const lower = s.label?.toLowerCase();
        if (lower === 'facebook') {
          return { ...s, url: 'https://www.facebook.com/share/19QzghDCgM/' };
        }
        if (lower === 'tiktok') {
          return { ...s, url: 'https://www.tiktok.com/@ksubzone_?_r=1&_t=ZS-99ccFoE843h' };
        }
        return s;
      })
    : DEFAULT_SOCIALS;

  // Always make sure both Facebook and TikTok are included in the footer
  if (!socialList.some((s) => s.label?.toLowerCase() === 'facebook')) {
    socialList.unshift({ label: 'Facebook', url: 'https://www.facebook.com/share/19QzghDCgM/' });
  }
  if (!socialList.some((s) => s.label?.toLowerCase() === 'tiktok')) {
    socialList.push({ label: 'TikTok', url: 'https://www.tiktok.com/@ksubzone_?_r=1&_t=ZS-99ccFoE843h' });
  }

  if (hideFooter) return null;

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.08] bg-luxury-950 text-slate-300">
      {/* Top ambient ambient glow and radiant gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-primary/70 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-44 bg-brand-primary/5 blur-3xl pointer-events-none" />

      {['home', 'movie', 'drama', 'article', 'listing'].includes(pageType) && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <AdSlot slotId="site_footer_banner" />
        </div>
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 sm:pt-16 sm:pb-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 text-left">
          
          {/* Column 1: Brand & Identity */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex min-w-0 items-center gap-3 group" aria-label={brand.siteName || 'KSubZone'}>
              <img
                src={resolveLogoUrl(brand.footerLogoUrl) || "/logo-ksubzone.webp"}
                alt={brand.siteName || 'KSubZone'}
                className="h-10 sm:h-12 w-auto max-w-[200px] object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <span className="sr-only">
                {brand.logoText || brand.siteName || 'KSUBZONE'}
              </span>
            </Link>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-400">
              {footer.description || 'Sri Lanka’s premier platform for synchronized Korean Drama and Movie Sinhala subtitles (SRT, VTT, ASS). Fast, free, and community-powered.'}
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {['සිංහල උපසිරැසි', 'K-Drama Subtitles', 'SRT Downloads', 'Korean Movies'].map((badge) => (
                <span
                  key={badge}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[10px] font-bold text-slate-300 backdrop-blur-sm"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
              {footer.quickLinksTitle || 'Quick Links'}
              <span className="mt-2 block h-0.5 w-8 rounded-full bg-brand-accent" />
            </h3>
            <nav className="mt-5 flex flex-col gap-2.5 text-xs sm:text-sm text-slate-400">
              {footerLinks.map((link) => (
                <Link
                  key={`${link.label}-${link.url}`}
                  href={link.url}
                  className="transition-all duration-150 hover:text-white hover:translate-x-1.5 inline-flex items-center gap-1.5"
                >
                  <span className="h-1 w-1 rounded-full bg-slate-600 group-hover:bg-brand-primary" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 3: Contact & Community */}
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
              {footer.contactTitle || 'Contact'}
              <span className="mt-2 block h-0.5 w-8 rounded-full bg-brand-secondary" />
            </h3>
            
            <div className="mt-5 space-y-3 text-xs sm:text-sm text-slate-400">
              <p className="flex gap-2.5 leading-relaxed">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-accent" />
                <span>{footer.contactText || 'KSubZone – Your destination for Korean drama reviews, movie guides, Sinhala subtitles, and entertainment updates.'}</span>
              </p>
              <a
                href={`mailto:${footer.email || 'contact@ksubzone.com'}`}
                className="inline-flex items-center gap-2.5 text-slate-300 transition-colors hover:text-brand-primary break-all"
              >
                <Mail className="h-4 w-4 flex-shrink-0 text-brand-secondary" />
                <span>{footer.email || 'contact@ksubzone.com'}</span>
              </a>
            </div>

            {/* Social Media Communities */}
            <div className="mt-6 pt-4 border-t border-white/[0.06]">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                {footer.followTitle || 'Follow Us'}
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
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer shadow-md ${conf.hoverClass}`}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 4: Attribution */}
          <div className="flex flex-col">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
              Attribution
              <span className="mt-2 block h-0.5 w-8 rounded-full bg-brand-primary" />
            </h3>
            
            <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-xl shadow-lg flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-black tracking-wider bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                  TMDB
                </span>
                <div className="h-3 w-8 rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)] animate-pulse" />
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                This product uses the TMDB API but is not endorsed or certified by TMDB.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Credits */}
        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-xs sm:text-sm font-medium text-slate-400" suppressHydrationWarning>
            © {new Date().getFullYear()} {brand.siteName || 'ksubzone'}. All Rights Reserved.
          </p>

          <p className="text-xs sm:text-sm font-medium text-slate-400">
            Developed by{' '}
            <span className="font-semibold text-brand-primary">
              C² Digital Creations
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

