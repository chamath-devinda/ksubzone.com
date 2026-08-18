'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/services/api/apiClient';
import GlassCard from '@/components/ui/GlassCard';
import Link from 'next/link';
import { permalinkSlug } from '@/utils/slug';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=150&q=80'
];

export default function Profile() {
  const { user, refreshProfile, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('watchlist');
  
  // Profile settings state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [password, setPassword] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // 2FA state
  const [toggling2FA, setToggling2FA] = useState(false);
  const [show2FaInfo, setShow2FaInfo] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  useEffect(() => {
    // Load notifications
    const fetchNotifications = async () => {
      setLoadingNotifications(true);
      try {
        const res = await apiClient.get('/api/auth/notifications');
        setNotifications(res.data);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoadingNotifications(false);
      }
    };
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess('');
    setProfileError('');
    try {
      const payload = { username, email, avatar };
      if (password) payload.password = password;
      
      const res = await apiClient.put('/api/auth/profile', payload);
      setUser(prev => ({ ...prev, ...res.data.user }));
      setProfileSuccess('Profile updated successfully!');
      setPassword('');
      setEditingProfile(false);
      refreshProfile();
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggle2FA = async (enable) => {
    setToggling2FA(true);
    try {
      const res = await apiClient.post('/api/auth/2fa', { enable });
      setUser(prev => ({ ...prev, twoFactorEnabled: res.data.twoFactorEnabled }));
      if (enable) {
        setShow2FaInfo(true);
      }
      refreshProfile();
    } catch (err) {
      console.error('2FA update failed:', err);
    } finally {
      setToggling2FA(false);
    }
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await apiClient.put(`/api/auth/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center text-slate-100">
        <div className="text-center">
          <p className="text-xl text-slate-400 mb-4">Please log in to view your profile.</p>
          <Link href="/auth" className="px-6 py-2 bg-brand-primary rounded-full font-semibold hover:bg-opacity-80 transition duration-300">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100 pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Profile Header */}
        <div className="bg-luxury-900 bg-opacity-40 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white border-opacity-5 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <img 
                src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                alt={user.username} 
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-brand-primary border-opacity-30 shadow-lg"
              />
              <button 
                onClick={() => setEditingProfile(true)}
                className="absolute inset-0 bg-black bg-opacity-65 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs font-semibold"
              >
                Change Photo
              </button>
            </div>
            <div className="text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
                  {user.username}
                </h1>
                {user.twoFactorEnabled && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500 bg-opacity-10 border border-emerald-500 border-opacity-30 text-emerald-400 rounded-full">
                    2FA Secured
                  </span>
                )}
              </div>
              <p className="text-slate-400 mt-1">{user.email}</p>
              <p className="text-xs text-slate-500 mt-2">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              className="px-6 py-2.5 bg-white bg-opacity-5 hover:bg-opacity-10 text-white font-semibold rounded-xl border border-white border-opacity-10 hover:border-opacity-20 transition duration-300 flex items-center justify-center gap-2"
            >
              {editingProfile ? 'Cancel Editing' : 'Edit Profile Settings'}
            </button>
          </div>
        </div>

        {/* Modal: Edit Profile Settings */}
        <AnimatePresence>
          {editingProfile && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-luxury-900 border border-white border-opacity-15 rounded-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-100">Update Profile Details</h2>
                  <button 
                    onClick={() => setEditingProfile(false)}
                    className="text-slate-400 hover:text-white text-lg font-bold"
                  >
                    &times;
                  </button>
                </div>
                
                {profileError && (
                  <div className="p-3 mb-4 rounded-lg bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 text-red-400 text-sm">
                    {profileError}
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Select an Avatar</label>
                    <div className="grid grid-cols-6 gap-3 mb-3">
                      {AVATAR_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAvatar(preset)}
                          className={`relative rounded-full overflow-hidden border-2 transition-all ${
                            avatar === preset ? 'border-brand-primary scale-110 shadow-md shadow-brand-primary/25' : 'border-transparent hover:scale-105'
                          }`}
                        >
                          <img src={preset} alt="preset" className="w-12 h-12 object-cover" />
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Or enter image URL"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      className="w-full px-4 py-2.5 bg-luxury-950 border border-white border-opacity-10 rounded-xl focus:border-brand-primary outline-none text-slate-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Username</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2.5 bg-luxury-950 border border-white border-opacity-10 rounded-xl focus:border-brand-primary outline-none text-slate-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-luxury-950 border border-white border-opacity-10 rounded-xl focus:border-brand-primary outline-none text-slate-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">New Password (leave blank to keep current)</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-luxury-950 border border-white border-opacity-10 rounded-xl focus:border-brand-primary outline-none text-slate-200 text-sm"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingProfile(false)}
                      className="px-5 py-2.5 bg-white bg-opacity-5 hover:bg-opacity-10 rounded-xl text-sm font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-5 py-2.5 bg-brand-primary hover:bg-opacity-95 text-white font-semibold rounded-xl text-sm transition"
                    >
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic 2FA Info Alert Modal */}
        <AnimatePresence>
          {show2FaInfo && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-luxury-900 border border-white border-opacity-15 rounded-2xl w-full max-w-md p-6 text-center"
              >
                <div className="w-16 h-16 bg-emerald-500 bg-opacity-10 border border-emerald-500 border-opacity-20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-2">Two-Factor Authentication Enabled</h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Your account is now extra secure. For demonstration purposes, you can complete future logins by entering code <span className="text-brand-primary font-mono font-bold">123456</span> or any matching 2FA code.
                </p>
                <button
                  onClick={() => setShow2FaInfo(false)}
                  className="w-full py-3 bg-brand-primary hover:bg-opacity-90 rounded-xl font-semibold transition text-sm text-white"
                >
                  Understood & Continue
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback Alert for Profile Actions */}
        {profileSuccess && (
          <div className="p-4 mb-6 rounded-xl bg-emerald-500 bg-opacity-10 border border-emerald-500 border-opacity-20 text-emerald-400 flex justify-between items-center text-sm">
            <span>{profileSuccess}</span>
            <button onClick={() => setProfileSuccess('')} className="font-bold hover:text-white">&times;</button>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-white border-opacity-10 gap-6 mb-8 overflow-x-auto scrollbar-none">
          {['watchlist', 'favorites', 'continue-watching', 'security', 'notifications'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 font-bold text-sm uppercase tracking-wider relative whitespace-nowrap transition-colors ${
                activeTab === tab ? 'text-brand-primary' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.replace('-', ' ')}
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Display */}
        <div className="pb-12">
          {activeTab === 'watchlist' && (
            <div>
              {(!user.watchlist || user.watchlist.length === 0) ? (
                <div className="text-center py-16 bg-luxury-900 bg-opacity-25 rounded-2xl border border-white border-opacity-5">
                  <p className="text-slate-400 text-lg mb-4">Your watchlist is currently empty.</p>
                  <Link href="/" className="px-5 py-2 bg-brand-primary hover:bg-opacity-90 rounded-full font-semibold transition text-sm">
                    Browse Movies & Dramas
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {user.watchlist.map((item) => {
                    const media = item.details || {};
                    return (
                      <GlassCard
                        key={item._id || item.mediaId}
                        id={item.mediaId}
                        title={media.title || 'Untitled'}
                        poster={media.poster || ''}
                        type={item.mediaType}
                        score={media.rating}
                        slug={media.slug}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div>
              {(!user.favorites || user.favorites.length === 0) ? (
                <div className="text-center py-16 bg-luxury-900 bg-opacity-25 rounded-2xl border border-white border-opacity-5">
                  <p className="text-slate-400 text-lg mb-4">You have not favorited any titles yet.</p>
                  <Link href="/" className="px-5 py-2 bg-brand-primary hover:bg-opacity-90 rounded-full font-semibold transition text-sm">
                    Browse Movies & Dramas
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {user.favorites.map((item) => {
                    const media = item.details || {};
                    return (
                      <GlassCard
                        key={item._id || item.mediaId}
                        id={item.mediaId}
                        title={media.title || 'Untitled'}
                        poster={media.poster || ''}
                        type={item.mediaType}
                        score={media.rating}
                        slug={media.slug}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'continue-watching' && (
            <div>
              {(!user.continueWatching || user.continueWatching.length === 0) ? (
                <div className="text-center py-16 bg-luxury-900 bg-opacity-25 rounded-2xl border border-white border-opacity-5">
                  <p className="text-slate-400 text-lg mb-2">No watch progress records found.</p>
                  <p className="text-slate-500 text-sm">Start watching an episode to save progress.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {user.continueWatching.map((item) => {
                    const media = item.details || {};
                    const progressPercent = item.duration > 0 ? (item.progress / item.duration) * 100 : 0;
                    const mediaSlug = permalinkSlug(media);
                    
                    // Build correct watch path
                    const watchUrl = item.mediaType === 'Movie'
                      ? `/movie/${mediaSlug}` // Movies play on detail/watch pages directly
                      : `/drama/${mediaSlug}/season-${item.seasonNumber}/episode-${item.episodeNumber}`;

                    return (
                      <div 
                        key={item._id} 
                        className="bg-luxury-900 bg-opacity-40 border border-white border-opacity-5 hover:border-opacity-15 rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 group"
                      >
                        <div className="relative aspect-video bg-luxury-950 overflow-hidden">
                          <img 
                            src={media.banner || media.poster || ''} 
                            alt={media.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-4">
                            <span className="text-xs font-bold text-brand-primary uppercase tracking-widest bg-brand-primary bg-opacity-10 px-2 py-0.5 rounded border border-brand-primary border-opacity-20 self-start mb-2">
                              {item.mediaType}
                            </span>
                            <h3 className="font-bold text-slate-100 group-hover:text-brand-primary transition-colors text-sm line-clamp-1">
                              {media.title}
                            </h3>
                            {item.mediaType === 'Drama' && (
                              <p className="text-xs text-slate-300">
                                Season {item.seasonNumber} • Episode {item.episodeNumber}
                              </p>
                            )}
                          </div>
                          
                          {/* Progress Line */}
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white bg-opacity-10">
                            <div 
                              className="h-full bg-brand-primary transition-all" 
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="p-4 flex justify-between items-center">
                          <div className="text-xs text-slate-400">
                            {Math.floor(item.progress / 60)}m / {Math.floor(item.duration / 60)}m
                          </div>
                          <Link 
                            href={watchUrl} 
                            className="px-3.5 py-1.5 bg-brand-primary text-white rounded-lg text-xs font-bold hover:bg-opacity-80 transition flex items-center gap-1"
                          >
                            Play
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-2xl bg-luxury-900 bg-opacity-40 backdrop-blur-md border border-white border-opacity-5 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-bold mb-4">Security Settings</h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Configure extra layers of security for your account. We strongly recommend enabling Two-Factor Authentication to keep your profile secure.
              </p>

              <div className="border-t border-white border-opacity-5 pt-6 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-200">Two-Factor Authentication (2FA)</h3>
                  <p className="text-xs text-slate-400 mt-1">Requires a verification code at login.</p>
                </div>
                <div>
                  <button
                    disabled={toggling2FA}
                    onClick={() => handleToggle2FA(!user.twoFactorEnabled)}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
                      user.twoFactorEnabled 
                        ? 'bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 text-red-400 hover:bg-opacity-20' 
                        : 'bg-brand-primary hover:bg-opacity-90 text-white'
                    }`}
                  >
                    {toggling2FA ? 'Processing...' : user.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-2xl bg-luxury-900 bg-opacity-40 backdrop-blur-md border border-white border-opacity-5 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-6">Notifications Alert Log</h2>
              
              {loadingNotifications ? (
                <div className="text-center py-8 text-slate-400">Loading alerts...</div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  You have no notifications or broadcast alerts.
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notif) => (
                    <div 
                      key={notif._id}
                      className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                        notif.isRead 
                          ? 'bg-luxury-950 bg-opacity-40 border-white border-opacity-5 text-slate-400' 
                          : 'bg-luxury-900 border-brand-primary border-opacity-20 text-slate-200'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${notif.isRead ? 'bg-slate-600' : 'bg-brand-primary'}`} />
                          <h4 className="font-bold text-sm text-slate-100">{notif.title}</h4>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed mb-1">{notif.message}</p>
                        <span className="text-xs text-slate-500">{new Date(notif.createdAt).toLocaleString()}</span>
                      </div>
                      
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkNotificationRead(notif._id)}
                          className="px-2.5 py-1 bg-white bg-opacity-5 hover:bg-opacity-10 border border-white border-opacity-10 hover:border-opacity-20 rounded-lg text-xs font-semibold text-slate-300 transition"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
