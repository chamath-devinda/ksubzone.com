import React from 'react';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import Detail from '@/features/media/pages/Detail';
import { fetchBackendJson } from '@/lib/server/backend';
import {
  buildMediaMetaTitle,
  buildMediaMetaDescription,
  generateMediaKeywords,
  cleanMediaText,
  cleanMediaTitle,
  buildAggregateRating,
  serializeJsonLd,
  SITE_URL,
} from '@/utils/seo';
// ISR: pages regenerate in the background at most once per hour.
// Pages are rendered and cached on first request instead of contacting the
// entire production catalog during deployment.
export const revalidate = 3600;

// Allow slugs published after the last build to be served on-demand
// (they will be cached after the first request).
export const dynamicParams = true;

const getDrama = cache(async (slug) => {
  return fetchBackendJson(`/api/media/dramas/${encodeURIComponent(slug)}?trackView=0`, {
    revalidate: 300,
    tags: ['dramas', `drama-${slug}`],
  });
});

export async function generateMetadata({ params }) {
  const { slug } = params;
  try {
    const data = await getDrama(slug);
    const media = data?.drama;
    if (media) {
      const cleanTitle = cleanMediaTitle(media.title);
      const canonicalUrl = `${SITE_URL}/drama/${slug}`;
      const title = buildMediaMetaTitle(media);
      const description = cleanMediaText(
        media.metaDescription || buildMediaMetaDescription(media),
        media.title,
        cleanTitle
      );
      const keywords = generateMediaKeywords(media);

      return {
        title,
        description,
        keywords,
        alternates: {
          canonical: canonicalUrl,
        },
        openGraph: {
          title,
          description,
          url: canonicalUrl,
          images: media.poster ? [{ url: media.poster }] : [],
          type: 'video.tv_show',
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: media.poster ? [media.poster] : [],
        },
      };
    }
  } catch (e) {
    console.error('Error generating drama metadata:', e);
    // Metadata is an enhancement. A short backend/WAF outage must not turn a
    // valid detail URL into a Server Components error page.
  }
  return {
    title: 'Korean TV Drama Sinhala Subtitles | KSubZone',
    description: 'Download synchronized Sinhala & English subtitles for Korean dramas.',
  };
}

export default async function DramaDetailPage({ params }) {
  const { slug } = params;
  let initialData;
  try {
    initialData = await getDrama(slug);
  } catch (error) {
    console.error('Drama detail prefetch failed; handing off to client retry:', error);
    // Let the client query retry the public endpoint. This keeps a transient
    // origin/CDN failure from replacing the whole portal with the root error UI.
    return <Detail type="Drama" />;
  }
  const media = initialData?.drama;
  if (!media) notFound();

  const canonicalUrl = `${SITE_URL}/drama/${slug}`;
  const cleanTitle = cleanMediaTitle(media.title);
  const cleanDescription = cleanMediaText(
    media.metaDescription || buildMediaMetaDescription(media),
    media.title,
    cleanTitle
  );

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${SITE_URL}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Korean Dramas",
        "item": `${SITE_URL}/dramas`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": cleanTitle,
        "item": canonicalUrl
      }
    ]
  };

  const tvSchema = {
    ...(media.schemaMarkup && typeof media.schemaMarkup === 'object' && !Array.isArray(media.schemaMarkup) ? media.schemaMarkup : {}),
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "@id": `${canonicalUrl}#tvseries`,
    "url": canonicalUrl,
    "name": cleanTitle,
    "alternateName": [
      `${cleanTitle} Sinhala Subtitles`,
      `${cleanTitle} සිංහල උපසිරැසි`,
      cleanTitle
    ],
    "description": cleanDescription,
    "mainEntityOfPage": canonicalUrl,
    "inLanguage": ["ko", "en", "si"],
    "genre": Array.isArray(media.keywords) ? media.keywords : (media.genre ? [media.genre] : ['Korean Drama']),
  };

  if (media.poster) {
    tvSchema.image = media.poster;
  }
  if (Array.isArray(media.cast) && media.cast.length > 0) {
    tvSchema.actor = media.cast.map(c => ({
      "@type": "Person",
      "name": typeof c === 'string' ? c : (c?.name || 'Cast Member')
    }));
  }
  const aggregateRating = buildAggregateRating(media);
  if (aggregateRating) tvSchema.aggregateRating = aggregateRating;
  else delete tvSchema.aggregateRating;


  const faqSchema = Array.isArray(media?.faq) && media.faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": media.faq.map(item => ({
      "@type": "Question",
      "name": cleanMediaText(item?.question || '', media.title, cleanTitle),
      "acceptedAnswer": {
        "@type": "Answer",
        "text": cleanMediaText(item?.answer || '', media.title, cleanTitle)
      }
    }))
  } : null;

  const speakableSchema = media ? {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `${cleanTitle} Sinhala & English Subtitles`,
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [".speakable-synopsis", ".speakable-faq-section"]
    }
  } : null;

  return (
    <>
      {breadcrumbs && (
        <script
          type="application/ld+json"
          id="breadcrumbs-jsonld"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }}
        />
      )}
      {tvSchema && (
        <script
          type="application/ld+json"
          id="tvseries-jsonld"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(tvSchema) }}
        />
      )}
      {faqSchema && (
        <script
          type="application/ld+json"
          id="faq-jsonld"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }}
        />
      )}
      {speakableSchema && (
        <script
          type="application/ld+json"
          id="speakable-jsonld"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(speakableSchema) }}
        />
      )}
      <Detail
        type="Drama"
        initialData={{
          ...initialData,
          drama: {
            ...media,
            title: cleanTitle,
            metaTitle: buildMediaMetaTitle(media),
            metaDescription: cleanDescription,
            schemaMarkup: tvSchema,
          },
        }}
      />
    </>
  );
}
