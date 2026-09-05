import React from 'react';
import Link from 'next/link';
import { Grid, Film, Tv, Sparkles } from 'lucide-react';

async function getGenresData() {
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
  try {
    const res = await fetch(`${backendUrl}/api/media/genres`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error('Failed to fetch genres');
    return await res.json();
  } catch (error) {
    console.error('Error fetching genres list:', error);
    return [];
  }
}

export const metadata = {
  title: 'Browse Korean Dramas & Movies by Genre | KSubZone',
  description: 'Explore Korean TV shows and movies categorized by genres. Find Action, Thriller, Comedy, Horror, Romance, and fantasy titles with Sinhala subtitles.',
  alternates: {
    canonical: 'https://www.ksubzone.com/genres',
  }
};

export default async function GenresPage() {
  const genres = Array.from(
    (await getGenresData()).reduce((map, genre) => {
      if (!genre?.slug) return map;
      const current = map.get(genre.slug);
      if (!current || Number(genre.totalCount || 0) > Number(current.totalCount || 0)) {
        map.set(genre.slug, genre);
      }
      return map;
    }, new Map()).values()
  );

  // JSON-LD Breadcrumbs for SEO
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "KSubZone",
        "item": "https://www.ksubzone.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Genres",
        "item": "https://www.ksubzone.com/genres"
      }
    ]
  };

  return (
    <div className="min-h-screen bg-transparent pb-16">
      {/* Structural SEO Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      {/* Header Banner */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.15),transparent_40%)]" />
        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-32 pb-10 sm:pb-12 text-left">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-brand-primary">
              <Grid className="w-3.5 h-3.5" /> Genre Navigation
            </span>
            <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Browse by Genre
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Find movies and TV shows based on your favorite categories. Browse through our synchronized Sinhala subtitles database.
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        {genres.length === 0 ? (
          <div className="glass-panel p-8 sm:p-20 rounded-2xl sm:rounded-3xl border border-white/5 text-center text-slate-400">
            <p className="text-sm font-bold">No genres found in the database.</p>
            <p className="text-xs text-slate-500 mt-1">Please seed or import content from TMDB first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {genres.map((genre) => (
              <article
                key={genre._id || genre.slug}
                className="glass-panel group relative isolate overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 hover:border-brand-primary/40 min-h-36 sm:min-h-44 flex flex-col items-center justify-end p-3 sm:p-5 text-center transition-all duration-500 hover:shadow-glass-neon hover:shadow-brand-primary/15"
              >
                {/* Dynamically Loaded Banner Backdrop from High-Rated Media */}
                {genre.banner && (
                  <>
                    <img
                      src={genre.banner}
                      alt={genre.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700 pointer-events-none"
                      loading="lazy"
                    />
                    {/* Dark gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-luxury-950 via-luxury-950/75 to-luxury-950/40 z-10 pointer-events-none" />
                  </>
                )}

                {/* Card Content */}
                <div className="relative z-20 flex flex-col items-center justify-center">
                  <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-white group-hover:text-brand-primary transition-colors duration-300 font-display">
                    {genre.name}
                  </h2>
                  <span className="mt-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-wider text-slate-300 group-hover:bg-brand-primary/20 group-hover:border-brand-primary/30 group-hover:text-brand-primary transition-all duration-300">
                    {genre.totalCount || 0} {genre.totalCount === 1 ? 'Title' : 'Titles'}
                  </span>
                  <div className="mt-3 grid w-full grid-cols-2 gap-2">
                    <Link
                      href={`/drama/genre/${genre.slug}`}
                      className="inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border border-brand-primary/30 bg-brand-primary/15 px-2 text-[9px] font-black uppercase tracking-wider text-violet-200 transition hover:bg-brand-primary hover:text-white"
                    >
                      <Tv className="h-3 w-3" /> Dramas
                    </Link>
                    <Link
                      href={`/movie/genre/${genre.slug}`}
                      className="inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border border-white/10 bg-black/30 px-2 text-[9px] font-black uppercase tracking-wider text-slate-200 transition hover:border-brand-primary/40 hover:text-white"
                    >
                      <Film className="h-3 w-3" /> Movies
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
