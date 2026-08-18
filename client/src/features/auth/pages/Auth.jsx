'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, KeyRound, Mail, User, ShieldCheck } from 'lucide-react';
import apiClient from '@/services/api/apiClient';
import { tokenService } from '@/services/api/tokenService';

export default function Auth() {
  const router = useRouter();
  const { loginUser, setUser, setAdmin } = useAuth();
  
  // Modes: 'login', 'register', 'verification', 'forgot', 'reset'
  const [mode, setMode] = useState('login');
  
  // Inputs
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code2fa, setCode2fa] = useState('');
  const [require2fa, setRequire2fa] = useState(false);

  // Email Code verification state
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyEmailAddr, setVerifyEmailAddr] = useState('');
  const [demoVerifyCode, setDemoVerifyCode] = useState(''); // helper to show in UI

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [demoResetCode, setDemoResetCode] = useState('');

  // Info alerts
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setInfo('');
    setRequire2fa(false);
  };

  // Form handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await loginUser(email, password, code2fa);
      if (data.require2Fa) {
        setRequire2fa(true);
        setInfo('Two-Factor Authentication is enabled. Please enter verification code (or 123456 for demo).');
      } else {
        router.push('/');
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to server. Please check if the backend is running.');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/api/auth/register', { username, email, password });
      if (res.data.token) {
        // Clear admin session to prevent concurrent mixed roles in single browser
        tokenService.removeAdminToken();
        setAdmin(null);

        tokenService.setUserToken(res.data.token);
        setUser(res.data.user);
        router.push('/');
      } else {
        setVerifyEmailAddr(res.data.email);
        setDemoVerifyCode(res.data.verificationCode); // Demo help
        setVerifyCode(res.data.verificationCode);
        setInfo('A verification code was sent to your email.');
        setMode('verification');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/api/auth/verify-email', {
        email: verifyEmailAddr.trim(),
        code: verifyCode.trim()
      });
      // Clear admin session to prevent concurrent mixed roles in single browser
      tokenService.removeAdminToken();
      setAdmin(null);

      tokenService.setUserToken(res.data.token);
      setUser(res.data.user);
      router.push('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Incorrect code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/api/auth/forgot-password', { email: forgotEmail });
      setDemoResetCode(res.data.resetCode);
      setInfo('Password reset code generated.');
      setMode('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/api/auth/reset-password', { email: forgotEmail, code: resetCode, newPassword });
      setInfo('Password reset successful. You can now login.');
      setMode('login');
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center pt-24 lg:pt-28 pb-16 px-4 relative">
      {/* Dynamic Background Glow elements */}
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-brand-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-brand-secondary/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden z-10"
      >
        {/* Banner Title */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-brand-primary/20 rounded-2xl flex items-center justify-center text-brand-primary">
            <Sparkles className="w-5 h-5 text-glow" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">
            {mode === 'login' && 'Sign In'}
            {mode === 'register' && 'Create Account'}
            {mode === 'verification' && 'Verify Account'}
            {mode === 'forgot' && 'Reset Request'}
            {mode === 'reset' && 'Create Password'}
          </h2>
          <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500">KSubZone Gateway</p>
        </div>

        {error && (
          <div className="p-3 bg-brand-secondary/15 border border-brand-secondary/35 rounded-2xl text-brand-secondary text-xs font-semibold mb-4 text-left">
            {error}
          </div>
        )}

        {info && (
          <div className="p-3 bg-brand-primary/15 border border-brand-primary/35 rounded-2xl text-brand-primary text-xs font-semibold mb-4 text-left">
            {info}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* LOGIN MODE */}
          {mode === 'login' && (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleLogin}
              className="flex flex-col gap-4 text-left"
            >
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 rounded-xl text-xs sm:text-sm glass-input"
                  />
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Password</label>
                  <button type="button" onClick={() => switchMode('forgot')} className="text-[10px] text-brand-primary hover:underline">Forgot?</button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 rounded-xl text-xs sm:text-sm glass-input"
                  />
                  <KeyRound className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>

              {require2fa && (
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-brand-accent mb-1.5 block">2FA Authorization Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter 2FA Code"
                      value={code2fa}
                      onChange={(e) => setCode2fa(e.target.value)}
                      className="w-full h-11 pl-11 pr-4 rounded-xl text-xs sm:text-sm glass-input border-brand-accent/50"
                    />
                    <ShieldCheck className="absolute left-4 top-3.5 w-4 h-4 text-brand-accent" />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-11 bg-brand-primary hover:bg-brand-primary/80 disabled:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center transition shadow-lg mt-2"
              >
                Sign In
              </button>

              <p className="text-center text-xs text-slate-400 mt-2">
                New to KSubZone?{' '}
                <button type="button" onClick={() => switchMode('register')} className="text-brand-primary hover:underline font-bold">Create Account</button>
              </p>
            </motion.form>
          )}

          {/* REGISTER MODE */}
          {mode === 'register' && (
            <motion.form
              key="register"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleRegister}
              className="flex flex-col gap-4 text-left"
            >
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 rounded-xl text-xs sm:text-sm glass-input"
                  />
                  <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 rounded-xl text-xs sm:text-sm glass-input"
                  />
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 rounded-xl text-xs sm:text-sm glass-input"
                  />
                  <KeyRound className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-11 bg-brand-primary hover:bg-brand-primary/80 disabled:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center transition shadow-lg mt-2"
              >
                Register
              </button>

              <p className="text-center text-xs text-slate-400 mt-2">
                Already registered?{' '}
                <button type="button" onClick={() => switchMode('login')} className="text-brand-primary hover:underline font-bold">Sign In</button>
              </p>
            </motion.form>
          )}

          {/* EMAIL VERIFICATION MODE */}
          {mode === 'verification' && (
            <motion.form
              key="verification"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onSubmit={handleVerify}
              className="flex flex-col gap-4 text-left"
            >
              <p className="text-xs text-slate-400 leading-relaxed">
                Please enter the 6-digit confirmation code for {verifyEmailAddr || 'your email'}.
              </p>
              {demoVerifyCode && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold">
                  Demo helper verification code: <strong>{demoVerifyCode}</strong>
                </div>
              )}
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">6-Digit Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 123456"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl text-center text-lg font-black tracking-widest glass-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-11 bg-brand-primary hover:bg-brand-primary/80 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center transition"
              >
                Verify & Sign In
              </button>
            </motion.form>
          )}

          {/* FORGOT PASSWORD REQUEST MODE */}
          {mode === 'forgot' && (
            <motion.form
              key="forgot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleForgot}
              className="flex flex-col gap-4 text-left"
            >
              <p className="text-xs text-slate-400 leading-relaxed">
                Provide your email address, and we will generate a recovery password token.
              </p>
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl text-xs glass-input"
                />
              </div>
              <button
                type="submit"
                className="h-11 bg-brand-primary hover:bg-brand-primary/80 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center transition"
              >
                Request Code
              </button>
              <button type="button" onClick={() => switchMode('login')} className="text-xs text-slate-400 hover:text-white transition">Back to Login</button>
            </motion.form>
          )}

          {/* RESET PASSWORD CREATE MODE */}
          {mode === 'reset' && (
            <motion.form
              key="reset"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleReset}
              className="flex flex-col gap-4 text-left"
            >
              {demoResetCode && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold">
                  Demo helper recovery token: <strong>{demoResetCode}</strong>
                </div>
              )}
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">Reset Token</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Token"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl text-xs glass-input"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl text-xs glass-input"
                />
              </div>
              <button
                type="submit"
                className="h-11 bg-brand-primary hover:bg-brand-primary/80 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center transition"
              >
                Save New Password
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
