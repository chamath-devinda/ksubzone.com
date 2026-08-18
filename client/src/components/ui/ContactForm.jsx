'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Mail, MessageSquare, User, HelpCircle } from 'lucide-react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setStatus('error');
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setStatus('loading');

    // Simulate sending message (e.g. 1.2s timeout)
    setTimeout(() => {
      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 1200);
  };

  if (status === 'success') {
    return (
      <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-white/10 text-center flex flex-col items-center gap-4 shadow-xl">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-white">Message Sent Successfully!</h3>
        <p className="text-sm text-slate-300 leading-relaxed max-w-md">
          Thank you for reaching out to KSubZone. We have received your inquiry and our editorial team will get back to you within 24 hours.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold uppercase tracking-wider hover:bg-brand-primary/80 transition"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/5 flex flex-col gap-5 text-left shadow-2xl">
      <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mb-2">
        <MessageSquare className="w-5.5 h-5.5 text-brand-primary" /> Send Us a Message
      </h2>

      {status === 'error' && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Name Input */}
      <div>
        <label htmlFor="contact-name" className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
          <User className="w-3 h-3 text-brand-primary" /> Name <span className="text-brand-secondary">*</span>
        </label>
        <input
          id="contact-name"
          type="text"
          name="name"
          placeholder="Enter your name"
          value={formData.name}
          onChange={handleChange}
          required
          disabled={status === 'loading'}
          className="w-full h-10 px-4 rounded-xl text-xs sm:text-sm glass-input"
        />
      </div>

      {/* Email Input */}
      <div>
        <label htmlFor="contact-email" className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
          <Mail className="w-3 h-3 text-brand-primary" /> Email Address <span className="text-brand-secondary">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          name="email"
          placeholder="yourname@example.com"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={status === 'loading'}
          className="w-full h-10 px-4 rounded-xl text-xs sm:text-sm glass-input"
        />
      </div>

      {/* Subject Input */}
      <div>
        <label htmlFor="contact-subject" className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-brand-primary" /> Subject / Topic
        </label>
        <input
          id="contact-subject"
          type="text"
          name="subject"
          placeholder="e.g. Subtitle request, Bug report, Translation application"
          value={formData.subject}
          onChange={handleChange}
          disabled={status === 'loading'}
          className="w-full h-10 px-4 rounded-xl text-xs sm:text-sm glass-input"
        />
      </div>

      {/* Message Input */}
      <div>
        <label htmlFor="contact-message" className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">
          Message / Details <span className="text-brand-secondary">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows="5"
          placeholder="How can we help you? Please provide specific drama/movie details if requesting sync timing..."
          value={formData.message}
          onChange={handleChange}
          required
          disabled={status === 'loading'}
          className="w-full p-4 rounded-xl text-xs sm:text-sm glass-input resize-none focus:outline-none"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="mt-2 h-11 w-full rounded-xl bg-brand-primary hover:bg-brand-primary/85 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-primary/10"
      >
        {status === 'loading' ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Sending message...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" /> Send Message
          </>
        )}
      </button>
    </form>
  );
}
