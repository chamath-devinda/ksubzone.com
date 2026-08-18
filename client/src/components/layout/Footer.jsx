'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clapperboard, Facebook, Instagram, Mail, MapPin, MessageCircle, Play, Search, Send, Star, Youtube, Sparkles } from 'lucide-react';
import { useSiteContent } from '@/hooks/useSiteContent';
import { resolveLogoUrl } from '@/utils/mediaImages';

const socialIcons = { Facebook, Instagram, YouTube: Youtube, Youtube };

export default function Footer() {
  const pathname = usePathname();
  const { content } = useSiteContent();
  const hideFooter = pathname?.startsWith('/management') || pathname?.includes('/episode-');
  const brand = content?.brand || {};
  const footer = content?.footer || {};
  const footerLinks = (footer.links || []).filter((link) => link.label && link.url);
  const socialLinks = (footer.socials || []).filter((link) => link.label && link.url);
  const featureLabels = footer.featureLabels || [];

  if (hideFooter) return null;

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-luxury-950">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-primary/60 to-transparent" />
      <div className="bg-luxury-900/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
            <div className="space-y-5">
              <Link href="/" className="inline-flex items-center gap-3">
                {resolveLogoUrl(brand.logoUrl) ? (
                  <img src={resolveLogoUrl(brand.logoUrl)} alt={brand.siteName || 'Site logo'} className="h-14 w-auto object-contain shadow-glass-neon" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-primary/30 bg-brand-primary/10 shadow-glass-neon">
                    <Clapperboard className="h-7 w-7 text-brand-primary" />
                  </span>
                )}
                <span className="text-2xl font-black uppercase tracking-wider bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent font-milker">
                  {brand.logoText || brand.siteName || 'KSUBZONE'}
                </span>
              </Link>
              <p className="max-w-sm text-sm leading-7 text-slate-400">{footer.description}</p>
            </div>

            <div>
              <h3 className="mb-5 text-sm font-extrabold uppercase tracking-wider text-white">
                {footer.quickLinksTitle || 'Quick Links'}
                <span className="mt-2 block h-0.5 w-8 rounded-full bg-brand-accent" />
              </h3>
              <nav className="flex flex-col gap-3 text-sm text-slate-400">
                {footerLinks.map((link) => (
                  <Link key={`${link.label}-${link.url}`} href={link.url} className="transition hover:text-brand-primary">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <h3 className="mb-5 text-sm font-extrabold uppercase tracking-wider text-white">
                {footer.contactTitle || 'Contact'}
                <span className="mt-2 block h-0.5 w-8 rounded-full bg-brand-secondary" />
              </h3>
              <div className="space-y-4 text-sm text-slate-400">
                <p className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-accent" />
                  {footer.contactText}
                </p>
                <a href={`mailto:${footer.email}`} className="flex gap-3 transition hover:text-brand-primary">
                  <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-secondary" />
                  {footer.email}
                </a>
              </div>
              
              {/* Follow Us / Socials integrated into contact col */}
              <div className="mt-8 flex gap-3">
                {socialLinks.map(({ label, url }) => {
                  const Icon = socialIcons[label] || Send;
                  return (
                    <a
                      key={label}
                      href={url}
                      aria-label={label}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-brand-primary/60 hover:bg-brand-primary/15 hover:text-white"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col">
              <h3 className="mb-5 text-sm font-extrabold uppercase tracking-wider text-white">
                Attribution
                <span className="mt-2 block h-0.5 w-8 rounded-full bg-brand-primary" />
              </h3>
              <div className="glass-panel border border-white/5 bg-white/[0.015] p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-wider bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                    TMDB
                  </span>
                  <div className="h-4 w-10 rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)] animate-pulse" />
                </div>
                <p className="text-xs leading-relaxed text-slate-400">
                  This product uses the TMDB API but is not endorsed or certified by TMDB.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 flex flex-col items-center justify-center gap-1 text-center text-sm text-slate-400">
            <p className="font-medium text-slate-300 flex items-center gap-1.5 flex-wrap justify-center">
              © {new Date().getFullYear()} {brand.siteName || 'KSubZone'}. <span className="text-slate-400">Designed by <span className="text-brand-primary font-bold">Chamath Devinda</span>.</span>
            </p>
            <div className="mt-2 mb-1 flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-[10px] font-black uppercase tracking-widest text-brand-accent shadow-[0_0_10px_rgba(244,63,94,0.2)]">
              <Sparkles className="w-3 h-3" /> AI Powered Platform
            </div>
            {footer.bottomText && <p className="text-xs text-slate-500 mt-2">{footer.bottomText}</p>}
          </div>
        </div>
      </div>
    </footer>
  );
}
