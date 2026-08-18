import React from 'react';
import Link from 'next/link';
import GlassCard from '@/components/ui/GlassCard';
import { Film } from 'lucide-react';

async function getGenreData(genreSlug) {
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
  try {
    // 1. Resolve genre slug by fetching all genres and matching
    const genresRes = await fetch(`${backendUrl}/api/media/genres`, { next: { revalidate: 86400 } });
    let genreName = genreSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (genresRes.ok) {
      const genres = await genresRes.json();
      const matched = genres.find(g => g.slug === genreSlug);
      if (matched) genreName = matched.name;
    }

    // 2. Fetch movies in this genre
    const moviesRes = await fetch(`${backendUrl}/api/media/movies?genre=${encodeURIComponent(genreSlug)}&limit=100`, { next: { revalidate: 3600 } });
    const moviesData = moviesRes.ok ? await moviesRes.json() : { movies: [] };
    
    return {
      genreName,
      movies: moviesData.movies || []
    };
  } catch (e) {
    console.error('Error fetching genre movie page data:', e);
    return {
      genreName: genreSlug,
      movies: []
    };
  }
}

export async function generateMetadata({ params }) {
  const { genre } = params;
  const { genreName } = await getGenreData(genre);
  return {
    title: `Best ${genreName} Korean Movies (Sinhala Subtitles) | KSubZone`,
    description: `Download Sinhala and English subtitles for the best ${genreName} Korean movies on KSubZone. Explore cast, synopsis, and subtitle files.`,
    alternates: {
      canonical: `https://www.ksubzone.com/movie/genre/${genre}`,
    }
  };
}

export default async function MovieGenrePage({ params }) {
  const { genre } = params;
  const { genreName, movies } = await getGenreData(genre);

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
        "name": "Movies",
        "item": "https://www.ksubzone.com/search?category=movie"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": genreName,
        "item": `https://www.ksubzone.com/movie/genre/${genre}`
      }
    ]
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${genreName} Korean Movies`,
    "itemListElement": movies.map((m, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "url": `https://www.ksubzone.com/movie/${m.slug || m._id}`,
      "name": m.title
    }))
  };

  return (
    <div className="min-h-screen bg-transparent pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />

      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(124,58,237,0.18),transparent_40%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-32 pb-12">
          <div className="max-w-3xl text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-brand-primary">
              <Film className="w-3.5 h-3.5" /> Genre Catalog
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              {genreName} Korean Movies
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explore Korean cinematic releases in the {genreName} genre category. Download Sinhala and English subtitle files.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {movies.length === 0 ? (
          <div className="glass-panel p-16 rounded-3xl border border-white/5 text-center text-slate-400">
            <p className="text-sm font-bold">No movies found in this genre yet.</p>
            <p className="text-xs text-slate-500 mt-1">Check back later or search other genres.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {movies.map((item) => (
              <GlassCard key={item._id} item={item} type="movie" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
