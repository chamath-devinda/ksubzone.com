# KSubZone redesign, SEO, and publishing notes

## Implemented public templates

- Homepage: cinematic responsive hero, trending/upcoming/latest/blockbuster rows, discovery filters, recent subtitle feed, responsive ad breaks, and direct catalog links.
- Catalogs: shared poster-card language for `/movies` and `/dramas`, mobile-friendly filters, loading/empty states, pagination, and ItemList structured data.
- Details: reusable movie/drama template with backdrop, poster, clean title, Sinhala keyword line, visible breadcrumb, ratings, genre cross-links, synopsis, cast, trailer, subtitle center, FAQ, discussion, and recommendations.
- Editorial/static: articles, article categories, article detail, genres, about, contact, HTML sitemap, navigation, and footer use the same surfaces, radii, spacing, typography, and focus behavior.
- Admin: complete KSubZone Studio shell with responsive ink sidebar, contextual top bar, global catalog search, quick-create menu, profile/notification controls, and light/dark themes.
- Admin dashboard: KSubZone operational hierarchy for TMDB import, movies/dramas, subtitles, Adsterra revenue, traffic, subtitle queue, top content, activity, SEO, and server health.
- Admin components: shared colorful KPI cards, tables, toolbars, forms, focus states, mobile stacked data rows, loading states, login, and profile surfaces across every `/management/*` screen.

## SEO checklist

- [x] Unique media titles in the pattern `Name (Year) Sinhala Subtitles | Name සිංහල උපසිරැසි - KSubZone`.
- [x] Unique descriptions mention SRT, VTT, and ASS downloads.
- [x] Target keyword variants generated for every media detail page.
- [x] Canonical URLs preserve `/drama/[slug]` and `/movie/[slug]`.
- [x] Exactly one page-level H1 with ordered content headings on key templates.
- [x] Descriptive poster/backdrop alt text with title and year where useful.
- [x] Movie, TVSeries, WebSite, Organization, Article, FAQ, BreadcrumbList, and ItemList JSON-LD.
- [x] AggregateRating is emitted only when a genuine rating value and source vote count exist; new TMDB imports retain `vote_count` as `ratingCount`.
- [x] Visible detail breadcrumbs and machine-readable breadcrumbs.
- [x] Genre links, recommendations, related articles, category links, and HTML sitemap provide internal-link paths.
- [x] Search, auth, profile, API, and management surfaces excluded from indexing as appropriate.
- [x] XML sitemap index covers static pages, movies, dramas, episodes, articles, genres, and article categories.
- [x] `/sitemap` is a user-facing directory and is linked from the footer even when CMS footer links are customized.

## Sitemap and indexing operations

The public `/sitemap.xml` is a sitemap index served by the API and points to split sitemaps for static pages, movies, dramas, episodes, articles, genres, and article categories. Database-backed maps are cached for one hour and refresh as content is published. The Next.js sitemap route remains a deployment fallback and includes the same core content types.

Submit only `https://www.ksubzone.com/sitemap.xml` in Google Search Console. Google will discover all child maps from the index. After a major migration, inspect the Page indexing and Core Web Vitals reports rather than repeatedly resubmitting unchanged URLs.

## Ad placement policy

See `client/ADS_CONFIGURATION.md` for the slot-by-slot map. All provider code is isolated in reserved frames. The hero and download controls never contain an ad, and the subtitle anchor lands on the subtitle section rather than an advertisement. Side rails are limited to viewports at least 1600px wide. Social bar and in-page push remain disabled by default.

## Ongoing speed recommendations

1. Put `/_next/image`, posters, and API JSON behind a CDN with stale-while-revalidate enabled.
2. Revalidate only the changed detail page plus the affected catalog/sitemap tags when a subtitle is published.
3. Keep catalog API payloads compact; never attach cast, FAQ, full schemas, or subtitle file lists to poster-grid responses.
4. Track real-user LCP, INP, and CLS separately for home, catalog, detail, and article templates.
5. Enforce poster aspect ratios at upload/import time and store width/height metadata for user-hosted art.
6. Archive or redirect duplicate legacy URLs with permanent 301s, preserving the current clean slug as canonical.
7. Periodically validate structured data and sitemap child URLs in Search Console after schema or routing changes.
