'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, User, LogOut, Menu, X, LayoutDashboard, Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSiteContent } from '@/hooks/useSiteContent';
import { permalinkSlug } from '@/utils/slug';
import { getMediaImage, handleImageFallback, resolveLogoUrl } from '@/utils/mediaImages';
import apiClient from '@/services/api/apiClient';

// Fast client-side search cache
const searchCache = new Map();

export default function Navbar() {
  const { user, admin, logoutUser, logoutAdmin } = useAuth();
  const { content } = useSiteContent();
  const router = useRouter();
  const pathname = usePathname();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileMenuOpen]);

  const searchRef = useRef(null);
  const catalogLinks = (content?.navigation?.links || []).filter((item) => item.label && item.url);
  const searchPlaceholder = content?.navigation?.searchPlaceholder || 'Search dramas, movies...';
  const brand = content?.brand || {};

  // Fetch Autocomplete Suggestions (Fast with Cache & AbortController)
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();

    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    // Instant Cache Hit (0ms delay)
    if (searchCache.has(query)) {
      setSuggestions(searchCache.get(query));
      setShowSuggestions(true);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const delayDebounce = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await apiClient.get('/api/media/search-suggestions', {
          params: { q: query, limit: 6 },
          signal: controller.signal
        });
        const combined = response.data?.suggestions || [];
        
        if (searchCache.size >= 50) {
          searchCache.delete(searchCache.keys().next().value);
        }
        searchCache.set(query, combined);
        setSuggestions(combined);
        setShowSuggestions(true);
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          console.error('Search error:', error);
        }
      } finally {
        setIsSearching(false);
      }
    }, 80);

    return () => {
      clearTimeout(delayDebounce);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery]);

  // Fetch Notifications
  useEffect(() => {
    if (user) {
      apiClient.get('/api/auth/notifications')
        .then(res => setNotifications(res.data.slice(0, 5)))
        .catch(err => console.error(err));
    }
  }, [user]);

  // Close search suggestions on clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await apiClient.put(`/api/auth/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* MOBILE BACKDROP OVERLAY */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Reserve the fixed bar's height so page headings start below it. */}
      <div aria-hidden="true" className="h-14 sm:h-16 shrink-0" />
      <header className="fixed inset-x-0 top-0 z-50 h-14 sm:h-16 w-full border-b border-white/[0.08] bg-luxury-950 shadow-lg shadow-black/30">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 relative">
          
          {/* BRAND LOGO */}
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4 z-10 lg:flex-initial">
            <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5 group">
              <img
                src={resolveLogoUrl(brand.logoUrl) || "/main-logo.webp"}
                alt={brand.siteName || 'KSubZone'}
                className="h-7 sm:h-9 w-auto max-w-[32px] sm:max-w-none object-contain transform group-hover:scale-105 transition-transform duration-300 flex-shrink-0"
              />
              <span className="min-w-0 max-w-[48vw] sm:max-w-[16rem] text-sm sm:text-xl font-black uppercase tracking-wide sm:tracking-wider truncate bg-gradient-to-r from-brand-primary via-purple-400 to-brand-secondary bg-clip-text text-transparent font-milker group-hover:brightness-125 transition">
                {brand.logoText || brand.siteName || 'KSUBZONE'}
              </span>
            </Link>
          </div>

          {/* CENTER NAVIGATION LINKS */}
          <nav className="hidden lg:flex items-center justify-center gap-5 xl:gap-7 flex-grow z-10">
            {catalogLinks.map((item) => (
              <Link 
                key={`${item.label}-${item.url}`} 
                href={item.url} 
                className="text-slate-300 hover:text-white transition-colors duration-200 text-xs font-bold uppercase tracking-wider whitespace-nowrap hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* RIGHT CONTROLS */}
          <div className="flex items-center justify-end gap-3 sm:gap-4 flex-shrink-0 z-10">
            {/* SEARCH BAR (AUTOCOMPLETE) */}
            <form onSubmit={handleSearchSubmit} className="hidden md:block relative w-36 lg:w-44 xl:w-56 flex-shrink-0" ref={searchRef}>
              <div className="relative">
                <input
                  type="text"
                  aria-label={searchPlaceholder}
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-full text-xs glass-input placeholder-slate-400 focus:border-brand-primary focus:bg-luxury-900/90"
                />
                {isSearching ? (
                  <Loader2 className="absolute left-3 top-2.5 w-3.5 h-3.5 text-brand-primary animate-spin pointer-events-none" />
                ) : (
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                )}
              </div>

              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    className="absolute top-12 right-0 w-80 glass-panel-heavy rounded-2xl p-2.5 shadow-2xl border border-white/10 z-50 backdrop-blur-2xl"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">Direct Suggestions</p>
                    {suggestions.map((item) => (
                      <Link
                        key={item._id}
                        href={`/${item.type}/${permalinkSlug(item)}`}
                        prefetch={false}
                        onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.06] transition duration-200"
                      >
                        <img
                          src={getMediaImage(item, 'thumb')}
                          alt={item.title}
                          className="w-9 h-12 object-cover rounded-lg flex-shrink-0 border border-white/10"
                          onError={(event) => handleImageFallback(event, item, 'thumb')}
                        />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-white truncate">{item.title}</p>
                          <p className="text-[10px] text-brand-primary uppercase font-extrabold tracking-wider mt-0.5">{item.type}</p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* USER & NOTIFICATIONS */}
            {user || admin ? (
              <div className="hidden lg:flex items-center gap-3">
                {user && (
                  <div className="relative">
                    <button
                      onClick={() => { setShowNotifications(!showNotifications); setShowUserDropdown(false); }}
                      aria-label="Notifications"
                      className="p-2 rounded-full hover:bg-white/[0.06] text-slate-300 hover:text-white transition"
                    >
                      <Bell className="w-5 h-5" />
                      {notifications.filter(n => !n.isRead).length > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-secondary rounded-full ring-2 ring-luxury-950" />
                      )}
                    </button>

                    <AnimatePresence>
                      {showNotifications && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 top-12 w-80 glass-panel-heavy rounded-2xl p-3 shadow-2xl border border-white/10 z-50 backdrop-blur-2xl"
                        >
                          <p className="text-xs font-black uppercase tracking-wider text-slate-300 mb-2 px-1">Notifications</p>
                          <hr className="border-white/10 mb-2" />
                          {notifications.length === 0 ? (
                            <p className="text-[11px] text-slate-400 text-center py-4">No notifications yet</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {notifications.map(n => (
                                <div
                                  key={n._id}
                                  onClick={() => handleMarkAsRead(n._id)}
                                  className={`p-2.5 rounded-xl transition cursor-pointer text-left ${n.isRead ? 'bg-transparent hover:bg-white/5' : 'bg-brand-primary/15 hover:bg-brand-primary/25 border border-brand-primary/20'}`}
                                >
                                  <p className="text-xs font-bold text-white">{n.title}</p>
                                  <p className="text-[10px] text-slate-300 mt-0.5">{n.message}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* USER PROFILE DROPDOWN */}
                <div className="relative">
                  <button
                    onClick={() => { setShowUserDropdown(!showUserDropdown); setShowNotifications(false); }}
                    className="flex items-center gap-2 p-1.5 pl-2.5 pr-3 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-brand-primary to-purple-500 flex items-center justify-center text-white overflow-hidden shadow-sm">
                      {user?.avatar || admin?.avatar ? (
                        <img src={user?.avatar || admin?.avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-200 hidden sm:inline">{user?.username || admin?.username || 'Account'}</span>
                  </button>

                  <AnimatePresence>
                    {showUserDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 top-12 w-52 glass-panel-heavy rounded-2xl p-2 shadow-2xl border border-white/10 z-50 backdrop-blur-2xl"
                      >
                        {user ? (
                          <>
                            <Link
                              href="/profile"
                              onClick={() => setShowUserDropdown(false)}
                              className="flex items-center gap-2 p-2 text-xs font-bold rounded-xl text-slate-200 hover:text-white hover:bg-white/[0.06] transition"
                            >
                              <User className="w-4 h-4 text-brand-primary" /> Profile Settings
                            </Link>
                            <hr className="border-white/10 my-1" />
                            <button
                              onClick={() => { setShowUserDropdown(false); logoutUser(); }}
                              className="w-full flex items-center gap-2 p-2 text-xs font-bold rounded-xl text-rose-400 hover:bg-rose-500/10 transition text-left"
                            >
                              <LogOut className="w-4 h-4" /> Sign Out
                            </button>
                          </>
                        ) : (
                          <>
                            <Link
                              href="/management/dashboard"
                              onClick={() => setShowUserDropdown(false)}
                              className="flex items-center gap-2 p-2 text-xs font-bold rounded-xl text-slate-200 hover:text-white hover:bg-white/[0.06] transition"
                            >
                              <LayoutDashboard className="w-4 h-4 text-brand-accent" /> Management Hub
                            </Link>
                            <hr className="border-white/10 my-1" />
                            <button
                              onClick={() => { setShowUserDropdown(false); logoutAdmin(); }}
                              className="w-full flex items-center gap-2 p-2 text-xs font-bold rounded-xl text-rose-400 hover:bg-rose-500/10 transition text-left"
                            >
                              <LogOut className="w-4 h-4" /> Sign Out Admin
                            </button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <Link
                href="/auth"
                className="hidden lg:flex h-9 px-5 rounded-full bg-gradient-to-r from-brand-primary to-purple-600 hover:brightness-110 text-white text-xs font-black uppercase tracking-wider items-center gap-2 transition shadow-lg shadow-brand-primary/25 border border-white/15 hover:scale-105 active:scale-95"
              >
                <User className="w-3.5 h-3.5 text-white" />
                <span>{content?.navigation?.signInLabel || 'Sign In'}</span>
              </Link>
            )}

            {/* DASHBOARD SHORTCUT */}
            {(admin || (user && user.hasDashboardAccess)) && (
              <div className="hidden lg:flex items-center ml-1">
                <Link
                  href="/management/dashboard"
                  className="w-9 h-9 border border-brand-accent/40 text-brand-accent hover:bg-brand-accent/15 hover:text-white rounded-full flex items-center justify-center transition shadow-sm"
                  title="Admin Dashboard"
                >
                  <LayoutDashboard className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* MOBILE MENU TOGGLE */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              className="h-11 w-11 flex-shrink-0 rounded-xl lg:hidden text-slate-300 hover:text-white hover:bg-white/10 transition flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU DRAWER */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              id="mobile-navigation"
              className="lg:hidden mx-3 sm:mx-6 mt-2 max-h-[calc(100dvh-5.25rem)] overflow-y-auto overscroll-contain glass-panel-heavy border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col gap-4 shadow-2xl backdrop-blur-2xl relative z-50 text-left"
            >
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <input
                  type="text"
                  aria-label={searchPlaceholder}
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-2xl text-xs glass-input placeholder-slate-400"
                />
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </form>

              {(user || admin) && (
                <div className="flex items-center gap-3 p-3 bg-white/[0.04] border border-white/10 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white overflow-hidden flex-shrink-0">
                    {user?.avatar || admin?.avatar ? (
                      <img src={user?.avatar || admin?.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-grow text-left">
                    <p className="text-xs font-black text-white truncate">{user?.username || admin?.username || 'Admin'}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{user?.email || admin?.email || 'Administrator'}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-slate-200 hover:text-white text-xs font-bold uppercase tracking-wider py-2 border-b border-white/[0.06]">Home</Link>
                <Link href="/search" onClick={() => setMobileMenuOpen(false)} className="text-slate-200 hover:text-white text-xs font-bold uppercase tracking-wider py-2 border-b border-white/[0.06]">Browse Catalog</Link>
                {catalogLinks.map((item) => (
                  <Link key={`${item.label}-${item.url}`} href={item.url} onClick={() => setMobileMenuOpen(false)} className="text-slate-200 hover:text-white text-xs font-bold uppercase tracking-wider py-2 border-b border-white/[0.06]">
                    {item.label}
                  </Link>
                ))}
              </div>

              {user && (
                <div className="flex flex-col gap-1">
                  <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="text-slate-200 hover:text-white text-xs font-bold uppercase tracking-wider py-2 border-b border-white/[0.06]">My Profile</Link>
                  {user.hasDashboardAccess && (
                    <Link href="/management/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-brand-accent text-xs font-bold uppercase tracking-wider py-2 border-b border-white/[0.06] flex items-center gap-1.5">
                      <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => { setMobileMenuOpen(false); logoutUser(); }}
                    className="text-left text-rose-400 text-xs font-bold uppercase tracking-wider py-2 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Log Out
                  </button>
                </div>
              )}

              {admin && (
                <div className="flex flex-col gap-1">
                  <Link href="/management/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-brand-accent text-xs font-bold uppercase tracking-wider py-2 border-b border-white/[0.06] flex items-center gap-1.5">
                    <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                  </Link>
                  <button
                    onClick={() => { setMobileMenuOpen(false); logoutAdmin(); }}
                    className="text-left text-rose-400 text-xs font-bold uppercase tracking-wider py-2 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Log Out Admin
                  </button>
                </div>
              )}

              {!user && !admin && (
                <Link
                  href="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full h-11 px-5 rounded-2xl bg-gradient-to-r from-brand-primary to-purple-600 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-brand-primary/25 border border-white/10 mt-1"
                >
                  <User className="w-4 h-4 text-white" />
                  <span>{content?.navigation?.signInLabel || 'Sign In'}</span>
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
