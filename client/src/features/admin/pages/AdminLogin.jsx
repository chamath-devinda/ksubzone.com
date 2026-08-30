'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  Film,
  Languages,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSiteContent } from '@/hooks/useSiteContent';
import { resolveLogoUrl } from '@/utils/mediaImages';

const FEATURES = [
  { icon: BarChart3, title: 'Live insights', text: 'Track content, traffic and community activity.' },
  { icon: Film, title: 'Content control', text: 'Manage movies, dramas and editorial releases.' },
  { icon: Languages, title: 'Subtitle workflow', text: 'Review, translate and publish subtitle files.' },
];

export default function AdminLogin() {
  const { admin, loginAdmin } = useAuth();
  const router = useRouter();
  const { content } = useSiteContent();
  const brand = content?.brand || {};
  const logoUrl = resolveLogoUrl(brand.logoUrl);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code2fa, setCode2fa] = useState('');
  const [require2Fa, setRequire2Fa] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (admin) router.push('/management/dashboard');
  }, [admin, router]);

  useEffect(() => {
    router.prefetch('/management/dashboard');
  }, [router]);

  if (admin) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await loginAdmin(email, password, require2Fa ? code2fa : undefined);
      if (data.require2Fa) {
        setRequire2Fa(true);
        setLoading(false);
      } else {
        router.push('/management/dashboard');
      }
    } catch (err) {
      if (!err.response) {
        setError(err.message || 'Cannot connect to the server. Please try again in a moment.');
      } else {
        setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
      }
      setLoading(false);
    }
  };

  return (
    <main className="admin-login min-h-screen relative overflow-hidden bg-[#080810] text-slate-100">
      <div className="admin-login-grid absolute inset-0 pointer-events-none" />
      <div className="absolute -left-32 -top-40 h-[36rem] w-[36rem] rounded-full bg-violet-600/[0.12] blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-64 right-[-8rem] h-[40rem] w-[40rem] rounded-full bg-fuchsia-600/[0.08] blur-[130px] pointer-events-none" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="hidden lg:flex flex-col justify-between border-r border-white/[0.07] px-10 py-9 xl:px-16 xl:py-12">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <span className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.055] shadow-[0_15px_40px_rgba(124,58,237,0.2)]">
              {logoUrl ? <img src={logoUrl} alt={brand.siteName || 'KSubZone'} className="h-8 w-8 object-contain" /> : <span className="font-display text-base font-bold">K</span>}
            </span>
            <span>
              <span className="block font-display text-base font-bold tracking-tight text-white">{brand.logoText || brand.siteName || 'KSubZone'}</span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500">Admin workspace</span>
            </span>
          </Link>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="max-w-xl py-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
              <Sparkles className="h-3 w-3" /> Private control center
            </div>
            <h1 className="max-w-lg font-display text-4xl font-bold leading-[1.08] tracking-[-0.045em] text-white xl:text-[52px]">
              Run KSubZone from one calm workspace.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-slate-400">
              Publish content, manage subtitles and understand your audience without losing sight of what needs attention.
            </p>

            <div className="mt-10 grid gap-3 xl:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-[18px] border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h2 className="mt-4 text-xs font-semibold text-white">{title}</h2>
                  <p className="mt-1.5 text-[10px] leading-4 text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="flex items-center gap-2 text-[10px] text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/70" />
            Protected access · Activity is securely logged
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-[430px]">
            <Link href="/" className="mb-10 flex items-center gap-3 lg:hidden w-fit">
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.055]">
                {logoUrl ? <img src={logoUrl} alt={brand.siteName || 'KSubZone'} className="h-7 w-7 object-contain" /> : <span className="font-display text-sm font-bold">K</span>}
              </span>
              <span className="font-display text-sm font-bold text-white">{brand.logoText || brand.siteName || 'KSubZone'}</span>
            </Link>

            <div className="mb-8">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[15px] border border-violet-400/15 bg-violet-500/10 text-violet-300">
                {require2Fa ? <ShieldCheck className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/80">Secure management portal</p>
              <h1 className="mt-2 font-display text-[32px] font-bold tracking-[-0.035em] text-white">
                {require2Fa ? 'Verify your identity' : 'Welcome back'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {require2Fa ? 'Enter the six-digit code from your authenticator to continue.' : 'Sign in with your administrator credentials to continue.'}
              </p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} role="alert" className="mb-5 flex items-start gap-3 rounded-[15px] border border-rose-400/15 bg-rose-500/[0.07] p-3.5 text-xs leading-5 text-rose-300">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/15"><span className="h-1.5 w-1.5 rounded-full bg-rose-300" /></span>
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!require2Fa ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold text-slate-300">Email address</span>
                    <span className="relative block">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                      <input type="email" required autoComplete="username" placeholder="admin@ksubzone.com" value={email} onChange={(event) => setEmail(event.target.value)} className="admin-login-input h-12 w-full rounded-[14px] pl-11 pr-4 text-sm outline-none" />
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold text-slate-300">Password</span>
                    <span className="relative block">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                      <input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} className="admin-login-input h-12 w-full rounded-[14px] pl-11 pr-12 text-sm outline-none" />
                      <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white/[0.05] hover:text-slate-300" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </span>
                  </label>
                </>
              ) : (
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold text-slate-300">Authentication code</span>
                  <input type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} placeholder="000000" value={code2fa} onChange={(event) => setCode2fa(event.target.value.replace(/\D/g, '').slice(0, 6))} className="admin-login-input h-14 w-full rounded-[14px] px-4 text-center font-mono text-xl font-semibold tracking-[0.5em] outline-none" />
                </label>
              )}

              <button type="submit" disabled={loading} className="admin-login-submit group flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Authenticating...</>
                ) : require2Fa ? (
                  <><CheckCircle2 className="h-4 w-4" /> Verify and continue</>
                ) : (
                  <>Open dashboard <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>
                )}
              </button>
            </form>

            <p className="mt-7 text-center text-[10px] leading-5 text-slate-600">
              Authorized KSubZone staff only. All access attempts are monitored for security.
            </p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
