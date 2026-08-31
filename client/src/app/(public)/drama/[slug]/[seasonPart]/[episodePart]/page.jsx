import React from 'react';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import Watch from '@/features/media/pages/Watch';
import { cleanMediaTitle, serializeJsonLd, SITE_URL } from '@/utils/seo';

const getId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.$oid || String(value);
};

const getDrama = cache(async (slug) => {
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
  try {
    const res = await fetch(`${backendUrl}/api/media/dramas/${slug}`, { next: { revalidate: 30 } });
    if (res.ok) {
      return res.json();
    }
  } catch (e) {
    console.error('Error fetching drama details for cache:', e);
  }
  return null;
});

export async function generateMetadata({ params }) {
  const { slug, seasonPart, episodePart } = params;
  const seasonNumber = Number(String(seasonPart || '').replace('season-', ''));
  const episodeNumber = Number(String(episodePart || '').replace('episode-', ''));

  try {
    const data = await getDrama(slug);
    if (data) {
      const drama = data?.drama;
      const cleanTitle = cleanMediaTitle(drama?.title);
      const episodes = data?.episodes || [];
      const activeSeasonDoc = data?.seasons?.find(s => s.seasonNumber === seasonNumber);
      const activeEpisodeDoc = episodes.find(
        ep => getId(ep.seasonId) === getId(activeSeasonDoc?._id) && ep.episodeNumber === episodeNumber
      );

      if (drama && activeEpisodeDoc) {
        const titleStr = `${cleanTitle} S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}${activeEpisodeDoc.episodeTitle ? ` "${activeEpisodeDoc.episodeTitle}"` : ''} Sinhala Subtitles | KSubZone`;
        const canonicalUrl = `${SITE_URL}/drama/${slug}/season-${seasonNumber}/episode-${episodeNumber}`;
        return {
          title: titleStr,
          description: activeEpisodeDoc.episodeDescription || `Download Sinhala and English subtitles for ${cleanTitle} S${seasonNumber}E${episodeNumber}.`,
          alternates: {
            canonical: canonicalUrl,
          },
          openGraph: {
            title: `${cleanTitle} S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')} Subtitles`,
            description: activeEpisodeDoc.episodeDescription,
            url: canonicalUrl,
            images: drama.poster ? [{ url: drama.poster }] : [],
            type: 'video.episode',
          },
        };
      }
    }
  } catch (e) {
    console.error('Error generating episode watch metadata:', e);
  }

  return {
    title: 'Watch Episode Subtitles | KSubZone',
    description: 'Download synchronized Sinhala & English subtitles.',
  };
}

export default async function EpisodeWatchPage({ params }) {
  const { slug, seasonPart, episodePart } = params;
  const seasonNumber = Number(String(seasonPart || '').replace('season-', ''));
  const episodeNumber = Number(String(episodePart || '').replace('episode-', ''));

  const initialDramaData = await getDrama(slug);
  const drama = initialDramaData?.drama;
  const episodes = initialDramaData?.episodes || [];
  const activeSeasonDoc = initialDramaData?.seasons?.find(s => s.seasonNumber === seasonNumber);
  const activeEpisodeDoc = episodes.find(
    ep => getId(ep.seasonId) === getId(activeSeasonDoc?._id) && ep.episodeNumber === episodeNumber
  );

  if (!drama || !activeEpisodeDoc) notFound();

  const cleanTitle = cleanMediaTitle(drama.title);
  const canonicalDramaUrl = `${SITE_URL}/drama/${slug}`;
  const canonicalEpisodeUrl = `${canonicalDramaUrl}/season-${seasonNumber}/episode-${episodeNumber}`;
  
  // Build breadcrumbs and episode schema
  let breadcrumbs = null;
  let episodeSchema = null;
  
  if (drama) {
      breadcrumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "KSubZone",
            "item": `${SITE_URL}/`
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Dramas",
            "item": `${SITE_URL}/dramas`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": cleanTitle,
            "item": canonicalDramaUrl
          },
          {
            "@type": "ListItem",
            "position": 4,
            "name": `Season ${seasonNumber}, Episode ${episodeNumber}`,
            "item": canonicalEpisodeUrl
          }
        ]
      };

      if (activeEpisodeDoc) {
        episodeSchema = activeEpisodeDoc.episodeSchemaMarkup && Object.keys(activeEpisodeDoc.episodeSchemaMarkup).length > 0
          ? { ...activeEpisodeDoc.episodeSchemaMarkup }
          : {
              "@context": "https://schema.org",
              "@type": "TVEpisode",
              "name": activeEpisodeDoc.episodeTitle || `Episode ${episodeNumber}`,
              "episodeNumber": episodeNumber,
              "description": activeEpisodeDoc.episodeDescription || `Download Sinhala and English subtitles for ${drama.title} S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}.`,
              "datePublished": activeEpisodeDoc.airDate || null,
              "partOfSeason": {
                "@type": "TVSeason",
                "seasonNumber": seasonNumber
              },
              "partOfSeries": {
                "@type": "TVSeries",
                "name": cleanTitle,
                "sameAs": canonicalDramaUrl
              }
            };
        episodeSchema["@context"] = "https://schema.org";
        episodeSchema["@type"] = "TVEpisode";
        episodeSchema.url = canonicalEpisodeUrl;
        episodeSchema.name = activeEpisodeDoc.episodeTitle || `Episode ${episodeNumber}`;
        episodeSchema.partOfSeries = {
          ...(episodeSchema.partOfSeries || {}),
          "@type": "TVSeries",
          "name": cleanTitle,
          "sameAs": canonicalDramaUrl,
        };
      }
  }

  return (
    <>
      {breadcrumbs && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }}
        />
      )}
      {episodeSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(episodeSchema) }}
        />
      )}
      <Watch
        initialDramaData={{
          ...initialDramaData,
          drama: { ...drama, title: cleanTitle },
        }}
      />
    </>
  );
}
