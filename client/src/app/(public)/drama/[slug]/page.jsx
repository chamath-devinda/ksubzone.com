import React from 'react';
import { cache } from 'react';
import Detail from '@/features/media/pages/Detail';

const getDrama = cache(async (slug) => {
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
  try {
    const res = await fetch(`${backendUrl}/api/media/dramas/${slug}`, { next: { revalidate: 86400 } });
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
      return {
        title: media.metaTitle || `${media.title} Sinhala & English Subtitles | KSubZone`,
        description: media.metaDescription || `${media.description || media.title} Sinhala and English subtitle downloads.`,
        keywords: media.seoKeywords || (media.title ? [media.title.toLowerCase()] : []),
        alternates: {
          canonical: `https://www.ksubzone.com/drama/${slug}`,
        },
        openGraph: {
          title: media.metaTitle || media.title,
          description: media.metaDescription || media.description,
          url: `https://www.ksubzone.com/drama/${slug}`,
          images: media.poster ? [{ url: media.poster }] : [],
          type: 'video.tv_show',
        },
        twitter: {
          card: 'summary_large_image',
          title: media.metaTitle || media.title,
          description: media.metaDescription || media.description,
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

  const breadcrumbs = media ? {
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
        "name": "Dramas",
        "item": "https://www.ksubzone.com/dramas"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": media.title,
        "item": `https://www.ksubzone.com/drama/${slug}`
      }
    ]
  } : null;

  const tvSchema = media?.schemaMarkup ? { ...media.schemaMarkup } : null;
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
    const ratingValue = media.imdbRating || media.tmdbRating || 0;
    if (ratingValue > 0) {
      tvSchema.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": ratingValue.toFixed(1),
        "bestRating": "10",
        "ratingCount": media.viewCount ? Math.max(10, Math.floor(media.viewCount / 5)) : 10
      };
    }
  }

  const faqSchema = media?.faq && media.faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": media.faq.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  } : null;

  const speakableSchema = media ? {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `${media.title} Sinhala & English Subtitles`,
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
        />
      )}
      {tvSchema && (
        <script
          type="application/ld+json"
          id="tvseries-jsonld"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(tvSchema) }}
        />
      )}
      {faqSchema && (
        <script
          type="application/ld+json"
          id="faq-jsonld"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {speakableSchema && (
        <script
          type="application/ld+json"
          id="speakable-jsonld"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableSchema) }}
        />
      )}
      <Detail type="Drama" initialData={initialData} />
    </>
  );
}
