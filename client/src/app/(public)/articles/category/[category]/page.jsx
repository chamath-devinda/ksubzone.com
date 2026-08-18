import React from 'react';
import Link from 'next/link';
import { BookOpen, CalendarDays, Clock3, Eye, ArrowRight } from 'lucide-react';

async function getCategoryData(categorySlug) {
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
  try {
    // 1. Fetch articles matching category slug
    const res = await fetch(`${backendUrl}/api/articles?category=${encodeURIComponent(categorySlug)}&limit=100`, { next: { revalidate: 3600 } });
    const data = res.ok ? await res.json() : { articles: [] };
    const articles = data.articles || [];

    // Resolve category name (proper casing) from any returned article, or fall back to slug
    let categoryName = categorySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (articles.length > 0) {
      const match = articles.find(a => a.category && a.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') === categorySlug);
      if (match) {
        categoryName = match.category;
      } else if (articles[0].category) {
        categoryName = articles[0].category;
      }
    }
    
    return {
      categoryName,
      articles
    };
  } catch (e) {
    console.error('Error fetching category article page data:', e);
    return {
      categoryName: categorySlug,
      articles: []
    };
  }
}

export async function generateMetadata({ params }) {
  const { category } = params;
  const { categoryName } = await getCategoryData(category);
  return {
    title: `${categoryName} Articles & Guides (K-Drama & Movie) | KSubZone`,
    description: `Read the latest ${categoryName} articles, reviews, guides, character analysis, and Sinhala subtitle notes on KSubZone.`,
    alternates: {
      canonical: `https://www.ksubzone.com/articles/category/${category}`,
    }
  };
}

export default async function ArticleCategoryPage({ params }) {
  const { category } = params;
  const { categoryName, articles } = await getCategoryData(category);

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
        "name": "Articles",
        "item": "https://www.ksubzone.com/articles"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": categoryName,
        "item": `https://www.ksubzone.com/articles/category/${category}`
      }
    ]
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${categoryName} Articles`,
    "itemListElement": articles.map((art, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "url": `https://www.ksubzone.com/articles/${art.slug}`,
      "name": art.title
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(124,58,237,0.18),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.08),transparent_40%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-32 pb-12">
          <div className="max-w-3xl text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-brand-primary">
              <BookOpen className="w-3.5 h-3.5" /> Article Category
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              {categoryName}
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Browse our collection of K-drama and movie articles in the "{categoryName}" category. Read summaries, guides, and reviews.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {['All', 'Guide', 'Character Study', 'Subtitles', 'Movies', 'Romance', 'Watchlist'].map((cat) => {
              const slug = cat === 'All' ? '' : cat.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const href = slug ? `/articles/category/${slug}` : '/articles';
              const isActive = cat.toLowerCase() === categoryName.toLowerCase() || category === slug;
              return (
                <Link
                  key={cat}
                  href={href}
                  className={`inline-flex items-center h-9 px-4 rounded-xl border text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition ${
                    isActive
                      ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20'
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:border-brand-primary/30'
                  }`}
                >
                  {cat}
                </Link>
              );
            })}
          </div>
        </div>

        {articles.length === 0 ? (
          <div className="glass-panel p-16 rounded-3xl border border-white/5 text-center text-slate-400">
            <p className="text-sm font-bold">No articles found in this category yet.</p>
            <p className="text-xs text-slate-500 mt-1">Check back later or search other categories.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => {
              const formattedDate = article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Draft';
              const readTime = `${article.readTime || 5} min read`;
              
              return (
                <article
                  key={article._id}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] hover:border-brand-primary/35 transition duration-300 shadow-lg shadow-black/20 flex flex-col h-full"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-luxury-900">
                    <img
                      src={article.coverImage || 'https://www.ksubzone.com/assets/default-share.jpg'}
                      alt={article.title}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                    <span className="absolute bottom-4 left-4 rounded-full bg-black/55 border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-xl">
                      {article.category}
                    </span>
                  </div>
                  
                  <div className="p-5 text-left flex flex-col flex-1 justify-between">
                    <div>
                      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" /> {formattedDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock3 className="w-3.5 h-3.5" /> {readTime}
                        </span>
                        {article.viewCount !== undefined && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> {article.viewCount} Views
                          </span>
                        )}
                      </div>
                      
                      <h3 className="mt-3 text-lg font-black text-white leading-snug group-hover:text-violet-100 transition">
                        {article.title}
                      </h3>
                      
                      <p className="mt-2 text-xs text-slate-400 leading-6 line-clamp-3">
                        {article.excerpt}
                      </p>
                    </div>
                    
                    <div className="mt-5 pt-4 border-t border-white/5">
                      <Link
                        href={article.slug ? `/articles/${article.slug}` : '#'}
                        className="text-[11px] font-black uppercase tracking-wider text-brand-primary flex items-center gap-1.5 hover:text-white transition duration-250 w-fit"
                      >
                        Read More <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
