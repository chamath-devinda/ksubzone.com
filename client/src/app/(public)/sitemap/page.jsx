import React from 'react';
import Link from 'next/link';
import { 
  Compass, Tv, Film, Grid, BookOpen, 
  Info, Mail, ArrowRight, ShieldCheck, Download
} from 'lucide-react';
import { permalinkSlug } from '@/utils/slug';
import { SITE_URL, buildBreadcrumbSchema, cleanMediaTitle } from '@/utils/seo';

export const metadata = {
  title: 'KSubZone Complete HTML Sitemap - Korean Dramas, Movies & Sinhala Subtitles',
  description: 'Explore the complete directory of Korean dramas, movies, genre catalogs, guides, and Sinhala subtitle downloads on KSubZone.',
  alternates: {
    canonical: `${SITE_URL}/sitemap`,
  },
  openGraph: {
    title: 'KSubZone Complete HTML Sitemap',
    description: 'Explore all Korean dramas, movies, genres, and Sinhala subtitle downloads on KSubZone.',
    url: `${SITE_URL}/sitemap`,
    type: 'website',
  },
};

async function getSitemapCatalog() {
  const backendUrl = process.env.BACKEND_URL || (
    process.env.NODE_ENV === 'production'
      ? 'https://api.ksubzone.com'
      : 'http://127.0.0.1:5000'
  );

  try {
    const [dramasRes, moviesRes, genresRes, articlesRes] = await Promise.all([
      fetch(`${backendUrl}/api/media/dramas?limit=100`, { next: { revalidate: 3600 } }).then(r => r.ok ? r.json() : { dramas: [] }),
      fetch(`${backendUrl}/api/media/movies?limit=100`, { next: { revalidate: 3600 } }).then(r => r.ok ? r.json() : { movies: [] }),
      fetch(`${backendUrl}/api/media/genres`, { next: { revalidate: 3600 } }).then(r => r.ok ? r.json() : []),
      fetch(`${backendUrl}/api/articles?limit=50`, { next: { revalidate: 3600 } }).then(r => r.ok ? r.json() : { articles: [] }),
    ]);

    const uniqueGenres = Array.from((genresRes || []).reduce((map, genre) => {
      if (!genre?.slug) return map;
      const current = map.get(genre.slug);
      if (!current || Number(genre.totalCount || 0) > Number(current.totalCount || 0)) {
        map.set(genre.slug, genre);
      }
      return map;
    }, new Map()).values());

    return {
      dramas: dramasRes.dramas || [],
      movies: moviesRes.movies || [],
      genres: uniqueGenres,
      articles: articlesRes.articles || [],
    };
  } catch (error) {
    console.error('Error loading sitemap catalog:', error);
    return { dramas: [], movies: [], genres: [], articles: [] };
  }
}

export default async function HtmlSitemapPage() {
  const { dramas, movies, genres, articles } = await getSitemapCatalog();
  const articleCategories = Array.from(new Set(articles.map((article) => article.category).filter(Boolean)))
    .map((name) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') }));

  const breadcrumbsSchema = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Sitemap', url: '/sitemap' },
  ]);

  const coreSections = [
    { title: 'Home', href: '/', desc: 'Homepage with trending K-Dramas & latest subtitle feed', icon: Compass },
    { title: 'Korean Dramas', href: '/dramas', desc: 'Browse the complete Korean drama directory', icon: Tv },
    { title: 'Korean Movies', href: '/movies', desc: 'Feature films & blockbuster movies with Sinhala subtitles', icon: Film },
    { title: 'Genres Catalog', href: '/genres', desc: 'Explore titles categorized by genre & themes', icon: Grid },
    { title: 'Articles & Guides', href: '/articles', desc: 'K-Drama watch guides, reviews & news', icon: BookOpen },
    { title: 'About KSubZone', href: '/about', desc: 'Our mission, subtitle team, and community info', icon: Info },
    { title: 'Contact Us', href: '/contact', desc: 'Support, subtitle requests, and inquiries', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-transparent pb-20 pt-24 sm:pt-28 text-left">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />

      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/15 border border-brand-primary/30 text-brand-primary text-xs font-black uppercase tracking-widest self-start">
            <Compass className="w-3.5 h-3.5" /> HTML Directory
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight font-display">
            KSubZone HTML Sitemap
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed">
            Welcome to the comprehensive site directory of KSubZone. Discover direct links to every Korean drama, movie, genre category, and synchronized Sinhala subtitle download.
          </p>
        </div>

        {/* SECTION 1: Core Navigation */}
        <section className="mt-12 flex flex-col gap-6">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5 font-display border-b border-white/[0.06] pb-3">
            <span className="p-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-brand-primary">
              <Compass className="w-5 h-5" />
            </span>
            Core Navigation & Pages
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {coreSections.map((sec) => {
              const Icon = sec.icon;
              return (
                <Link
                  key={sec.href}
                  href={sec.href}
                  className="glass-panel p-5 rounded-2xl border border-white/[0.08] hover:border-brand-primary/40 hover:bg-white/[0.04] transition group flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 group-hover:scale-110 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-black text-white group-hover:text-brand-primary transition">
                      {sec.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    {sec.desc}
                  </p>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-primary flex items-center gap-1 mt-auto">
                    Visit Page <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* SECTION 2: Korean TV Dramas Directory */}
        <section className="mt-16 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-white/[0.06] pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5 font-display">
                <span className="p-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-brand-primary">
                  <Tv className="w-5 h-5" />
                </span>
                Korean TV Dramas (Sinhala Subtitles)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Index of ongoing and completed Korean drama series available on KSubZone.
              </p>
            </div>
            <Link
              href="/dramas"
              className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              View all dramas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {dramas.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No dramas found in catalog.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {dramas.map((drama) => {
                const year = drama.releaseDate ? new Date(drama.releaseDate).getFullYear() : null;
                return (
                  <Link
                    key={drama._id}
                    href={`/drama/${permalinkSlug(drama)}`}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-primary/30 hover:bg-white/[0.05] transition flex items-center justify-between gap-2 group"
                  >
                    <div className="min-w-0 flex flex-col">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-brand-primary transition truncate">
                        {cleanMediaTitle(drama.title) || drama.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {year ? `${year} • ` : ''}Sinhala Subtitles
                      </span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-primary flex-shrink-0 transition-colors" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 3: Korean Movies Directory */}
        <section className="mt-16 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-white/[0.06] pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5 font-display">
                <span className="p-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-brand-secondary">
                  <Film className="w-5 h-5" />
                </span>
                Korean Movies (Sinhala Subtitles)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Index of Korean feature films, blockbusters, and indie releases with Sinhala subtitles.
              </p>
            </div>
            <Link
              href="/movies"
              className="text-xs font-bold text-brand-secondary hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              View all movies <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {movies.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No movies found in catalog.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {movies.map((movie) => {
                const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
                return (
                  <Link
                    key={movie._id}
                    href={`/movie/${permalinkSlug(movie)}`}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-secondary/30 hover:bg-white/[0.05] transition flex items-center justify-between gap-2 group"
                  >
                    <div className="min-w-0 flex flex-col">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-brand-secondary transition truncate">
                        {cleanMediaTitle(movie.title) || movie.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {year ? `${year} • ` : ''}Movie Sinhala Sub
                      </span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-secondary flex-shrink-0 transition-colors" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 4: Genre Cross-Linking */}
        <section className="mt-16 flex flex-col gap-6">
          <div className="border-b border-white/[0.06] pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5 font-display">
              <span className="p-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-amber-400">
                <Grid className="w-5 h-5" />
              </span>
              Korean Entertainment Genres
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Explore Korean drama and movie titles filtered by your favorite genres.
            </p>
          </div>

          {genres.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No genres available.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {genres.map((g) => (
                <div key={g.slug || g.name} className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-xs font-black text-white truncate">{g.name}</span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <Link href={`/drama/genre/${g.slug}`} className="hover:text-brand-primary transition">
                      Dramas
                    </Link>
                    <span>•</span>
                    <Link href={`/movie/genre/${g.slug}`} className="hover:text-brand-secondary transition">
                      Movies
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 5: Articles & Subtitle Guides */}
        {articles.length > 0 && (
          <section className="mt-16 flex flex-col gap-6">
            <div className="border-b border-white/[0.06] pb-3">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5 font-display">
                <span className="p-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-emerald-400">
                  <BookOpen className="w-5 h-5" />
                </span>
                Articles, Reviews & Guides
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                K-Drama watch guides, episode breakdowns, translator insights, and articles.
              </p>
            </div>

            {articleCategories.length > 0 && (
              <nav aria-label="Article categories" className="flex flex-wrap gap-2">
                {articleCategories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/articles/category/${category.slug}`}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition hover:border-brand-primary/40 hover:text-white"
                  >
                    {category.name}
                  </Link>
                ))}
              </nav>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {articles.map((art) => (
                <Link
                  key={art._id || art.slug}
                  href={`/articles/${art.slug}`}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/30 hover:bg-white/[0.05] transition flex flex-col gap-1 group"
                >
                  <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition line-clamp-1">
                    {art.title}
                  </span>
                  <p className="text-[10px] text-slate-400 line-clamp-1">
                    {art.summary || 'Read full Korean drama article and guide on KSubZone.'}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
