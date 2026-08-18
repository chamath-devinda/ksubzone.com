import React from 'react';
import ContactForm from '@/components/ui/ContactForm';
import { Mail, ShieldAlert, MessageCircleHeart } from 'lucide-react';

export const metadata = {
  title: 'Contact Us | KSubZone - Korean Subtitle Center',
  description: 'Reach out to the KSubZone team for subtitle sync patch requests, translator registration queries, or movie catalog suggestions.',
  keywords: ['contact ksubzone', 'request subtitles', 'ksubzone email'],
  alternates: {
    canonical: 'https://www.ksubzone.com/contact',
  },
};

export default function ContactPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-32 pb-16 text-left flex flex-col gap-10 min-h-screen bg-transparent">
      {/* Header Banner */}
      <div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center gap-2">
          Contact KSubZone
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
          Have a question about a subtitle release? Want to request a sync patch for a specific webtoon release or report an issue? Send us a message and we will respond quickly.
        </p>
      </div>

      <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-8 items-start mt-4">
        {/* Contact Info Panels */}
        <div className="flex flex-col gap-6">
          {/* Email Card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Direct Email</h3>
              <p className="text-xs text-slate-400 mt-1">For official support, partnerships, or legal claims.</p>
              <a 
                href="mailto:contact@ksubzone.com" 
                className="text-sm font-bold text-brand-secondary hover:underline block mt-2"
              >
                contact@ksubzone.com
              </a>
            </div>
          </div>

          {/* Subtitle Request Notice */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-3 bg-brand-accent/5">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Subtitle Requests</h3>
              <p className="text-xs text-slate-300 leading-5 mt-1 font-light">
                Please make sure to mention the exact **TMDB ID** or **IMDb link** of the drama/movie and specifies the release name (e.g. *NF.WEB-DL*) to speed up timing alignment.
              </p>
            </div>
          </div>

          {/* Editorial Note */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-3 bg-white/[0.01]">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <MessageCircleHeart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Community translators</h3>
              <p className="text-xs text-slate-400 leading-5 mt-1 font-light">
                If you are a member of our community and want to apply for uploader permissions, please include your username in the message.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Form Container */}
        <div>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
