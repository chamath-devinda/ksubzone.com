import React from 'react';
import { Info, ShieldCheck, Heart, Sparkles, Film, Users, BookOpen } from 'lucide-react';

export const metadata = {
  title: 'About Us | KSubZone - Korean Entertainment Platform',
  description: 'Learn about KSubZone, the premium catalog for Korean dramas, movies, synchronized Sinhala & English subtitles, and reviews.',
  keywords: ['about ksubzone', 'kdrama sinhala translation team', 'ksubzone story'],
  alternates: {
    canonical: 'https://www.ksubzone.com/about',
  },
};

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-32 pb-16 text-left flex flex-col gap-14 min-h-screen bg-transparent">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-r from-brand-primary/10 via-white/[0.02] to-brand-secondary/5 p-8 sm:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.15),transparent_40%)]" />
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary">
            <Info className="w-3.5 h-3.5" /> Our Journey
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight">
            Connecting South Asian Fans with Korean Cinema
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-7 font-light">
            Welcome to KSubZone, your destination for premium Korean entertainment, structured guides, and verified community-translated Sinhala and English subtitles. 
          </p>
        </div>
      </section>

      {/* Core Mission Grid */}
      <section className="grid md:grid-cols-2 gap-8">
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 flex flex-col gap-4">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-5.5 h-5.5 text-brand-accent animate-pulse" /> Our Mission
          </h2>
          <p className="text-sm text-slate-300 leading-7 font-light">
            Our goal is to make Korean movies and TV shows accessible to everyone by bridging the language gap. We provide high-quality translation files, episode synopses, and detailed reviews to help local K-drama fans enjoy their favorite releases seamlessly.
          </p>
        </div>
        
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 flex flex-col gap-4">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-5.5 h-5.5 text-brand-secondary" /> Quality & Sync Timing
          </h2>
          <p className="text-sm text-slate-300 leading-7 font-light">
            We understand that a delay of even a single second can ruin a scene's impact. That is why our community-translated SRT, VTT, and ASS subtitles undergo strict timing checks and reviews by translators before being approved in our releases queue.
          </p>
        </div>
      </section>

      {/* Values & Features Section */}
      <section className="flex flex-col gap-8 border-t border-white/5 pt-12">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Heart className="w-6 h-6 text-brand-primary" /> Why KSubZone Stands Out
          </h2>
          <p className="text-xs text-slate-400 mt-1">Our platform is designed with features tailored specifically for K-drama lovers.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white/[0.015] border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mb-2">
              <Film className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Unified Catalog</h3>
            <p className="text-xs text-slate-400 leading-6 font-light">
              Explore extensive records containing ratings, directors, cast listings, and summaries populated through TMDB integration.
            </p>
          </div>

          <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white/[0.015] border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-brand-secondary/10 border border-brand-secondary/20 flex items-center justify-center text-brand-secondary mb-2">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Translator Community</h3>
            <p className="text-xs text-slate-400 leading-6 font-light">
              Our site connects Sri Lankan translation enthusiasts with viewers, creating a thriving environment for crowd-sourced subtitle releases.
            </p>
          </div>

          <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white/[0.015] border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent mb-2">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Guides & Analysis</h3>
            <p className="text-xs text-slate-400 leading-6 font-light">
              We publish detailed ending explanations, character arcs analyses, romance tropes retrospectives, and watchlists lists.
            </p>
          </div>
        </div>
      </section>

      {/* Editorial Note */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-10 text-center flex flex-col items-center gap-4">
        <h3 className="text-lg sm:text-xl font-bold text-white">Join the Community</h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-7 max-w-2xl font-light">
          KSubZone is powered by Hallyu fans, for Hallyu fans. If you are a Sinhala/English translator, feel free to register on our platform and share your sync translation files with the community.
        </p>
      </section>
    </div>
  );
}
