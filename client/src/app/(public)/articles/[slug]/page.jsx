import React from 'react';
import { cache } from 'react';
import ArticleDetail from '@/features/articles/pages/ArticleDetail';

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
      "@id": `https://www.ksubzone.com/articles/${slug}`
    }
  } : null;

  return (
    <>
      {articleSchema && (
        <script
          type="application/ld+json"
          id="article-jsonld"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
      )}
      <ArticleDetail initialData={initialData} />
    </>
  );
}
