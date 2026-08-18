'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSiteContent } from '@/hooks/useSiteContent';
import { resolveLogoUrl } from '@/utils/mediaImages';

export default function AdminLogin() {
  const { admin, loginAdmin } = useAuth();
  const router = useRouter();
  const { content } = useSiteContent();
  const brand = content?.brand || {};
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code2fa, setCode2fa] = useState('');
  const [require2Fa, setRequire2Fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (admin) {
      router.push('/management/dashboard');
    }
  }, [admin, router]);

  if (admin) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        setError('Cannot connect to server. Please check if the backend is running.');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please check credentials.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-luxury-950 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      
      {/* Cinematic Gradient Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-primary opacity-[0.06] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600 opacity-[0.05] blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-luxury-900 bg-opacity-40 backdrop-blur-xl border border-white border-opacity-5 p-8 rounded-2xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {resolveLogoUrl(brand.logoUrl) ? (
              <img src={resolveLogoUrl(brand.logoUrl)} alt={brand.siteName || 'Logo'} className="h-16 w-auto object-contain shadow-[0_0_20px_rgba(244,63,94,0.15)]" />
            ) : (
              <span className="text-xs font-bold uppercase tracking-widest text-brand-primary bg-brand-primary bg-opacity-10 px-3 py-1 rounded-full border border-brand-primary border-opacity-20">
                Internal Portal
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-4 tracking-tight">
            <span className="font-milker">{brand.logoText || brand.siteName || 'KSubZone'}</span> <span className="text-brand-primary font-medium">Control</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">{brand.tagline || 'Sign in to access management panels'}</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3.5 mb-6 rounded-xl bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 text-red-400 text-sm font-medium"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!require2Fa ? (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@ksubzone.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-luxury-950 border border-white border-opacity-10 focus:border-brand-primary rounded-xl outline-none text-slate-200 text-sm transition placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-luxury-950 border border-white border-opacity-10 focus:border-brand-primary rounded-xl outline-none text-slate-200 text-sm transition placeholder-slate-600"
                />
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                2FA Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={code2fa}
                onChange={(e) => setCode2fa(e.target.value)}
                className="w-full px-4 py-3 bg-luxury-950 border border-white border-opacity-10 focus:border-brand-primary rounded-xl outline-none text-slate-200 text-center tracking-widest font-mono text-lg transition placeholder-slate-600"
              />
              <p className="text-xs text-slate-500 mt-2.5 text-center leading-relaxed">
                Enter your secondary validator key. For testing, use code <span className="text-brand-primary font-bold">123456</span>.
              </p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-primary hover:bg-opacity-90 text-white rounded-xl text-sm font-bold transition duration-300 shadow-lg shadow-brand-primary/15 relative overflow-hidden"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : require2Fa ? (
              'Verify & Enter'
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white border-opacity-5 text-center">
          <p className="text-xs text-slate-500">
            For security reasons, all configuration attempts are logged.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
