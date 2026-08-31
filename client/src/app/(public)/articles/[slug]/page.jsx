import React from 'react';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import ArticleDetail from '@/features/articles/pages/ArticleDetail';
import { serializeJsonLd, SITE_URL } from '@/utils/seo';

const getArticle = cache(async (slug) => {
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
  try {
    const res = await fetch(`${backendUrl}/api/articles/${slug}`, { next: { revalidate: 30 } });
    if (res.ok) {
      return res.json();
    }
  } catch (e) {
    console.error('Error fetching article details for cache:', e);
  }
  return null;
});

export async function generateMetadata({ params }) {
  const { slug } = params;
  try {
    const data = await getArticle(slug);
    const article = data?.article;
    if (article) {
      return {
        title: article.metaTitle || `${article.title} | KSubZone Articles`,
        description: article.metaDescription || article.excerpt || 'Read this article on KSubZone.',
        keywords: article.seoKeywords || article.tags || [],
        alternates: {
          canonical: `https://www.ksubzone.com/articles/${slug}`,
        },
        openGraph: {
          title: article.metaTitle || article.title,
          description: article.metaDescription || article.excerpt,
          url: `https://www.ksubzone.com/articles/${slug}`,
          images: article.coverImage ? [{ url: article.coverImage }] : [],
          type: 'article',
        },
        twitter: {
          card: 'summary_large_image',
          title: article.metaTitle || article.title,
          description: article.metaDescription || article.excerpt,
          images: article.coverImage ? [article.coverImage] : [],
        },
      };
    }
  } catch (e) {
    console.error('Error generating article metadata:', e);
  }
  return {
    title: 'KSubZone Article Details',
    description: 'Read the latest K-drama guides and reviews.',
  };
}

export default async function ArticleDetailPage({ params }) {
  const { slug } = params;
  const initialData = await getArticle(slug);
  const article = initialData?.article;

  const articleSchema = article ? {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "image": article.coverImage ? [article.coverImage] : [],
    "datePublished": article.publishedAt || article.createdAt,
    "dateModified": article.updatedAt || article.publishedAt || article.createdAt,
    "description": article.excerpt || article.metaDescription || article.title,
    "url": `${SITE_URL}/articles/${slug}`,
    "author": {
      "@type": "Person",
      "name": "KSubZone Contributor"
    },
    "publisher": {
      "@type": "Organization",
      "name": "KSubZone",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.ksubzone.com/main-logo.webp"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${SITE_URL}/articles/${slug}`
    }
  } : null;

  if (!article) notFound();

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "KSubZone", "item": `${SITE_URL}/` },
      { "@type": "ListItem", "position": 2, "name": "Articles", "item": `${SITE_URL}/articles` },
      { "@type": "ListItem", "position": 3, "name": article.title, "item": `${SITE_URL}/articles/${slug}` },
    ],
  };

  return (
    <>
      {articleSchema && (
        <script
          type="application/ld+json"
          id="article-jsonld"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleSchema) }}
        />
      )}
      <script
        id="article-breadcrumbs-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }}
      />
      <ArticleDetail initialData={initialData} />
    </>
  );
}
