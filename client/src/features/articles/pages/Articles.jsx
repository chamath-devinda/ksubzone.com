'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpenText, CalendarDays, Clock3, Flame, Loader2, Search, Sparkles, Star, Eye } from 'lucide-react';
import SeoTags from '@/components/seo/SeoTags';

const categories = ['All', 'Guide', 'Character Study', 'Subtitles', 'Movies', 'Romance', 'Watchlist'];

export default function Articles({ initialData }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const { data: articlesData, isLoading, isFetching } = useQuery({
    queryKey: ['publicArticles', activeCategory],
    queryFn: async () => {
      const categoryParam = activeCategory === 'All' ? '' : `&category=${encodeURIComponent(activeCategory)}`;
      const res = await apiClient.get(`/api/articles?limit=30${categoryParam}`);
      return res.data.articles || [];
    },
    initialData: activeCategory === 'All' && Array.isArray(initialData) ? initialData : undefined,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1
  });

  const articleSource = Array.isArray(articlesData) && articlesData.length > 0
    ? articlesData.map(article => ({
        id: article._id,
        slug: article.slug,
        title: article.title,
        category: article.category,
        date: article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Draft',
        readTime: `${article.readTime || 5} min read`,
        image: article.coverImage,
        excerpt: article.excerpt,
        featured: article.isFeatured,
        viewCount: article.viewCount || 0
      }))
    : [];

  const visibleArticles = useMemo(() => {
    return articleSource;
  }, [articleSource]);

  const featuredArticle = visibleArticles.find((article) => article.featured) || visibleArticles[0];
  const otherArticles = visibleArticles.filter((article) => article.id !== featuredArticle?.id);

  return (
    <div className="min-h-screen bg-transparent pb-16">
      <SeoTags
        title="KSubZone Articles - K-Drama Guides, Reviews & Sinhala Subtitle Notes"
        description="Read Korean drama articles, watch guides, character analysis, Sinhala subtitle notes, and movie recommendations on KSubZone."
        keywords={['kdrama articles', 'korean drama guides', 'sinhala subtitles', 'ksubzone articles']}
        canonical="https://www.ksubzone.com/articles"
        image={featuredArticle?.image}
      />

      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(124,58,237,0.22),transparent_34%),radial-gradient(circle_at_82%_10%,rgba(236,72,153,0.14),transparent_32%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-32 pb-16 sm:pb-20">
          <div className="max-w-3xl text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-brand-primary">
              <BookOpenText className="w-3.5 h-3.5" /> KSubZone Journal
            </span>
            <h1 className="mt-5 text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
              K-Drama articles, guides, and watch notes
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-7">
              Korean dramas, movies, subtitles, cast chemistry, genre guides, and Sinhala viewer notes in one place.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 flex flex-col gap-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {categories.map((category) => {
              const slug = category === 'All' ? '' : category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const href = slug ? `/articles/category/${slug}` : '/articles';
              const isActive = activeCategory === category;
              return (
                <Link
                  key={category}
                  href={href}
                  className={`inline-flex items-center h-9 px-4 rounded-xl border text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition ${
                    isActive
                      ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20'
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:border-brand-primary/30'
                  }`}
                >
                  {category}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 h-10 text-xs text-slate-400">
            <Search className="w-4 h-4 text-brand-primary" />
            Articles about K-dramas, movies, and subtitles
          </div>
        </div>

        {featuredArticle && (
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid lg:grid-cols-[1.2fr_0.8fr] gap-0 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/30"
          >
            <div className="relative min-h-[320px]">
              <img src={featuredArticle.image} alt={featuredArticle.title} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/45 to-transparent" />
              <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-200">
                <Flame className="w-3.5 h-3.5" /> Featured
              </span>
            </div>
            <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center text-left">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <span className="rounded-full bg-brand-primary/15 border border-brand-primary/30 px-3 py-1 text-brand-primary">{featuredArticle.category}</span>
                <span className="text-slate-500 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {featuredArticle.date}</span>
                <span className="text-slate-500 flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5" /> {featuredArticle.readTime}</span>
                {featuredArticle.viewCount !== undefined && (
                  <span className="text-slate-500 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {featuredArticle.viewCount} Views</span>
                )}
              </div>
              <h2 className="mt-4 text-3xl sm:text-4xl font-black text-white leading-tight">{featuredArticle.title}</h2>
              <p className="mt-4 text-sm text-slate-300 leading-7">{featuredArticle.excerpt}</p>
              <Link href={featuredArticle.slug ? `/articles/${featuredArticle.slug}` : '#'} className="mt-6 h-11 w-fit px-5 rounded-2xl bg-white text-black hover:bg-brand-primary hover:text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition">
                Read Article <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.article>
        )}

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {otherArticles.map((article, index) => (
            <motion.article
              key={article.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] hover:border-brand-primary/35 transition shadow-lg shadow-black/20"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-luxury-900">
                <img src={article.image} alt={article.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <span className="absolute bottom-4 left-4 rounded-full bg-black/55 border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-xl">
                  {article.category}
                </span>
              </div>
              <div className="p-5 text-left">
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {article.date}</span>
                  <span className="flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> {article.readTime}</span>
                  {article.viewCount !== undefined && (
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {article.viewCount} Views</span>
                  )}
                </div>
                <h3 className="mt-3 text-lg font-black text-white leading-snug group-hover:text-violet-100 transition">{article.title}</h3>
                <p className="mt-2 text-xs text-slate-400 leading-6">{article.excerpt}</p>
                <Link href={article.slug ? `/articles/${article.slug}` : '#'} className="mt-4 text-[11px] font-black uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                  Read More <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.article>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-brand-primary/15 via-white/[0.03] to-brand-secondary/10 p-6 sm:p-8 text-left flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-accent" /> Add more K-drama articles
            </h2>
            <p className="mt-2 text-sm text-slate-300 leading-6">
              This page is ready for drama reviews, episode explainers, subtitle notes, cast stories, and watchlist guides.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-slate-300">
            <Star className="w-4 h-4 text-amber-300 fill-current" />
            KSubZone editorial section
          </div>
        </section>
      </main>
    </div>
  );
}
