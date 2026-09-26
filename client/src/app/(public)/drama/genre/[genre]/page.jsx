import React from 'react';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import GlassCard from '@/components/ui/GlassCard';
import { Tv } from 'lucide-react';
import { permalinkSlug } from '@/utils/slug';
import { serializeJsonLd } from '@/utils/seo';
import AdSlot from '@/components/ads/AdSlot';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import { fetchBackendJson } from '@/lib/server/backend';

const getGenreData = cache(async (genreSlug) => {
  const [genres, dramasData] = await Promise.all([
    fetchBackendJson('/api/media/genres', { revalidate: 30, tags: ['genres'] }),
    fetchBackendJson(`/api/media/dramas?genre=${encodeURIComponent(genreSlug)}&limit=100`, {
      revalidate: 30,
      tags: ['dramas', `drama-genre-${genreSlug}`],
    }),
  ]);
  const matched = (genres || []).find((genre) => genre.slug === genreSlug);
  return {
    genreName: matched?.name || genreSlug.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
    dramas: dramasData?.dramas || [],
  };
});

export async function generateMetadata({ params }) {
  const { genre } = params;
  const { genreName } = await getGenreData(genre);
  return {
    title: `Best ${genreName} Korean Dramas (Sinhala Subtitles) | KSubZone`,
    description: `Download Sinhala and English subtitles for the best ${genreName} Korean dramas on KSubZone. Explore cast, synopsis, and subtitle files.`,
    alternates: {
      canonical: `https://www.ksubzone.com/drama/genre/${genre}`,
    }
  };
}

export default async function DramaGenrePage({ params }) {
  const { genre } = params;
  const { genreName, dramas } = await getGenreData(genre);
  if (dramas.length === 0) notFound();

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Dramas', url: '/dramas' },
    { name: genreName, url: `/drama/genre/${genre}` },
  ];

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${genreName} Korean Dramas`,
    "itemListElement": dramas.map((d, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "url": `https://www.ksubzone.com/drama/${permalinkSlug(d)}`,
      "name": d.title
    }))
  };

  return (
    <div className="min-h-screen bg-transparent pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemList) }}
      />

      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(124,58,237,0.18),transparent_40%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-32 pb-12">
          <Breadcrumbs items={breadcrumbItems} className="mb-5" />
          <div className="max-w-3xl text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-brand-primary">
              <Tv className="w-3.5 h-3.5" /> Genre Catalog
            </span>
            <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight font-display">
              {genreName} Korean Dramas
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explore Korean TV series in the {genreName} genre category. Download Sinhala and English subtitles for each episode below.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <AdSlot slotId="listing_content_banner" className="mb-6" />

        {dramas.length === 0 ? (
          <div className="glass-panel p-16 rounded-3xl border border-white/5 text-center text-slate-400">
            <p className="text-sm font-bold">No dramas found in this genre yet.</p>
            <p className="text-xs text-slate-500 mt-1">Check back later or search other genres.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {dramas.map((item, index) => (
              <React.Fragment key={item._id}>
                <GlassCard item={item} type="drama" />
                {index === 5 && (
                  <div className="col-span-full w-full my-3">
                    <AdSlot slotId="listing_mid_banner" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        <AdSlot slotId="listing_bottom_banner" className="mt-8" />
      </div>
    </div>
  );
}
