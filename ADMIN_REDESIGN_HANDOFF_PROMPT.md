# KSubZone redesign continuation prompt

```text
Continue and finish the KSubZone (ksubzone.com) redesign in the existing Next.js 14 + PHP codebase. Do not remove existing site/admin functionality and keep the existing clean URL patterns.

CURRENTLY IMPLEMENTED

PUBLIC WEBSITE
- Premium cinematic dark theme: #06040B, #0D0916, #151024, primary #7C3AED.
- Redesigned navigation, hero, poster cards, buttons, sections, footer, movie/drama listings, and reusable detail templates.
- Mobile-first layouts, lazy poster loading, AVIF/WebP optimization, and no global particle canvas.
- Clean display-title handling for legacy polluted titles without changing slugs.
- Visible breadcrumbs, corrected heading hierarchy, dynamic metadata, Movie/TVSeries JSON-LD, genuine aggregate ratings only, ItemList/Breadcrumb schemas, Sinhala/English keywords, internal links, alt text, robots.txt, XML sitemap, and HTML sitemap.
- Sitemap coverage: static pages, movies, dramas, episodes, articles, article categories, genres, and /sitemap, with genre deduplication.
- Ad zones: below hero, between rows, desktop sidebar, article/detail in-content, and footer. Ads never cover or interrupt Download Subtitle.

ADMIN WORKSPACE — KSUBZONE STUDIO
- Complete Doit-inspired visual system adapted to KSubZone content operations rather than banking.
- Default full-dark theme plus optional light-mode support.
- Light colors: canvas #F3F5FA, card #FFFFFF, sidebar #0C1424, primary #490570 with #72149A highlights.
- Semantic colors: teal #12B892, coral #FF6268, amber #FFB64D, violet #8B5CF6.
- Dark colors: canvas #05070B, card #0D1118, border #202630, sidebar #07090E.
- Responsive grouped sidebar for Dashboard/Profile/TMDB Import; Movies/Dramas/Articles/Subtitles/Comments/Members; Subtitle Studio/SRT Cleaner/Site Builder; Database/Backups/SEO.
- Contextual sticky topbar with global search, Quick Create, notifications, theme switch, public-site link, and profile menu.
- Operational dashboard hero, quick launchers, colorful KPI cards, Adsterra panel, traffic, content distribution, subtitle queue, top content, activity, and system/SEO health.
- Shared tables, search toolbars, form controls, modals, hover/focus states, login/profile styling, loading states, and mobile stacked rows across all /management/* pages.

READ FIRST
- DESIGN.md
- REDESIGN_IMPLEMENTATION.md
- client/src/index.css (the final KSUBZONE STUDIO override layer is authoritative)
- client/src/features/admin/components/AdminSidebar.jsx
- client/src/features/admin/components/AdminTopBar.jsx
- client/src/features/admin/components/StatCard.jsx
- client/src/features/admin/pages/AdminDashboard.jsx

REMAINING BEFORE PRODUCTION LAUNCH
1. Real-device QA at 360, 390, 768, 1024, and desktop widths using a valid admin test account. Check every tool, long table, drawer, uploader, and keyboard focus order.
2. Replace production placeholders with live values, especially static sitemap/SEO telemetry labels when not supplied by the backend.
3. Configure the real Adsterra API key and placement codes securely; verify policy compliance and CLS.
4. Backfill ratingCount/voteCount for legacy catalog records so valid ratings can appear in schema.
5. Validate structured data in Google's Rich Results Test and submit /sitemap.xml in Search Console after deployment.
6. Run Lighthouse and real-user Core Web Vitals with production images and ads; tune CDN caching, image dimensions, and font loading from measured results.
7. Crawl the live domain for broken links, redirects, canonicals, and duplicate metadata before launch.

QUALITY RULES
- Preserve user data and all existing dirty-worktree changes.
- Use reusable components/tokens instead of one-off styling.
- Maintain WCAG AA contrast, roughly 44px touch targets, and visible keyboard focus.
- Never invent rating/review counts or render AggregateRating without a genuine count.
- Never place ads over or immediately before a subtitle download control.
- After changes, run `npm run build` in client and report exact results plus production-only checks.
```
