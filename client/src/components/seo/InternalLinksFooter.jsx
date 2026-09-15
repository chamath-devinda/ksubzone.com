/**
 * InternalLinksFooter — Server Component
 *
 * Renders a comprehensive set of semantic <a href> internal links that:
 *  1. Distribute PageRank across all major route families
 *  2. Ensure every key section is reachable within 1 click of every page
 *  3. Are crawlable by Googlebot without any JavaScript execution
 *
 * This component is intentionally a pure Server Component so it is included
 * in the raw HTML response with zero client-side overhead.
 */

import Link from 'next/link';
import { SITE_URL } from '@/utils/seo';

const CORE_LINKS = [
  { label: 'Korean Dramas', href: '/dramas', desc: 'Full drama catalog with Sinhala subtitles' },
  { label: 'Korean Movies', href: '/movies', desc: 'Movie catalog with Sinhala & English subs' },
  { label: 'Genre Directory', href: '/genres', desc: 'Browse by genre and theme' },
  { label: 'Articles & Guides', href: '/articles', desc: 'K-Drama watch guides and news' },
  { label: 'HTML Sitemap', href: '/sitemap', desc: 'Full site index' },
  { label: 'About KSubZone', href: '/about', desc: 'About our platform' },
  { label: 'Contact Us', href: '/contact', desc: 'Get in touch' },
];

export default function InternalLinksFooter() {
  return (
    <nav
      aria-label="Site sections"
      className="border-t border-white/[0.06] pt-6 pb-4"
    >
      <p className="sr-only">Quick navigation to all site sections</p>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2">
        {CORE_LINKS.map(({ label, href, desc }) => (
          <li key={href}>
            <Link
              href={href}
              title={desc}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors duration-150 underline-offset-2 hover:underline"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
