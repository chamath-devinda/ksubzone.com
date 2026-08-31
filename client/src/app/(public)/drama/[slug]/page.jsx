import React from 'react';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import Detail from '@/features/media/pages/Detail';
import {
  buildMediaMetaTitle,
  cleanMediaText,
  cleanMediaTitle,
  serializeJsonLd,
  SITE_URL,
} from '@/utils/seo';

const getDrama = cache(async (slug) => {
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
  try {
    // Subtitle availability changes independently from the drama metadata.
    // Keep the server-rendered snapshot short lived even if on-demand
    // revalidation is delayed by the hosting layer.
    const res = await fetch(`${backendUrl}/api/media/dramas/${slug}`, { next: { revalidate: 60 } });
    if (res.ok) {
      return res.json();
    }
  } catch (e) {
    console.error('Error fetching drama details for cache:', e);
  }
  return null;
});

export async function generateMetadata({ params }) {
  const { slug } = params;
  try {
    const data = await getDrama(slug);
    const media = data?.drama;
    if (media) {
      const cleanTitle = cleanMediaTitle(media.title);
      const canonicalUrl = `${SITE_URL}/drama/${slug}`;
      const rawKeywords = Array.isArray(media.seoKeywords) ? media.seoKeywords : (media.seoKeywords ? [media.seoKeywords] : []);
      const description = cleanMediaText(
        media.metaDescription || `${media.description || cleanTitle} Sinhala and English subtitle downloads.`,
        media.title,
        cleanTitle
      );
      return {
        title: buildMediaMetaTitle(media),
        description,
        keywords: (rawKeywords.length ? rawKeywords : (cleanTitle ? [cleanTitle.toLowerCase()] : []))
          .map((keyword) => cleanMediaText(keyword, media.title, cleanTitle)),
        alternates: {
          canonical: canonicalUrl,
        },
        openGraph: {
          title: buildMediaMetaTitle(media),
          description,
          url: canonicalUrl,
          images: media.poster ? [{ url: media.poster }] : [],
          type: 'video.tv_show',
        },
        twitter: {
          card: 'summary_large_image',
          title: buildMediaMetaTitle(media),
          description,
          images: media.poster ? [media.poster] : [],
        },
      };
    }
  } catch (e) {
    console.error('Error generating drama metadata:', e);
  }
  return {
    title: 'TV Drama Subtitles | KSubZone',
    description: 'Download synchronized Sinhala & English subtitles.',
  };
}

export default async function DramaDetailPage({ params }) {
  const { slug } = params;
  const initialData = await getDrama(slug);
  const media = initialData?.drama;
  if (!media) notFound();

  const canonicalUrl = `${SITE_URL}/drama/${slug}`;
  const cleanTitle = cleanMediaTitle(media.title);
  const cleanDescription = cleanMediaText(
    media.metaDescription || media.description || `${cleanTitle} Sinhala and English subtitle downloads.`,
    media.title,
    cleanTitle
  );

  const breadcrumbs = media ? {
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
        "item": "https://www.ksubzone.com/dramas"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": cleanTitle,
        "item": canonicalUrl
      }
    ]
  } : null;

  const tvSchema = {
    ...(media.schemaMarkup || {}),
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "@id": `${canonicalUrl}#tvseries`,
    "url": canonicalUrl,
    "name": cleanTitle,
    "description": cleanDescription,
    "mainEntityOfPage": canonicalUrl,
  };
  if (tvSchema) {
    if (media.poster) {
      tvSchema.image = media.poster;
    }
    if (media.cast && media.cast.length > 0) {
      tvSchema.actor = media.cast.map(c => ({
        "@type": "Person",
        "name": c.name
      }));
    }
    if (tvSchema.aggregateRating && !Number(tvSchema.aggregateRating.ratingCount || tvSchema.aggregateRating.reviewCount)) {
      delete tvSchema.aggregateRating;
    }
  }

  const faqSchema = media?.faq && media.faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": media.faq.map(item => ({
      "@type": "Question",
      "name": cleanMediaText(item.question, media.title, cleanTitle),
      "acceptedAnswer": {
        "@type": "Answer",
        "text": cleanMediaText(item.answer, media.title, cleanTitle)
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
