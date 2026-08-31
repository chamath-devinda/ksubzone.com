'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import { useToast } from '@/features/admin/components/Toast';
import {
  TrendingUp, Film, Tv, Languages, Star, Users, Settings,
  Database, Trash2, MessageSquare, AlertTriangle, ShieldCheck
} from 'lucide-react';

export default function ReviewManager() {
  const { admin } = useAuth();
  const toast = useToast();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' or 'comments'
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'reviews') {
        const res = await apiClient.get('/api/admin/reviews');
        const list = Array.isArray(res.data) ? res.data : res.data?.reviews;
        setReviews(Array.isArray(list) ? list : []);
      } else {
        const res = await apiClient.get('/api/admin/comments');
        const list = Array.isArray(res.data) ? res.data : res.data?.comments;
        setComments(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      setError('Failed to fetch discussion queue records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Delete this user review permanently?')) return;
    try {
      await apiClient.delete(`/api/admin/reviews/${id}`);
      setReviews(prev => prev.filter(r => r._id !== id));
      toast.success('User review deleted successfully.');
    } catch (err) {
      toast.error('Failed to delete review.');
    }
  };

  const handleDeleteComment = async (id) => {
    if (!window.confirm('Delete this comment and its replies permanently?')) return;
    try {
      await apiClient.delete(`/api/admin/comments/${id}`);
      setComments(prev => prev.filter(c => c._id !== id));
      toast.success('Comment and replies deleted successfully.');
    } catch (err) {
      toast.error('Failed to delete comment.');
    }
  };

  return (
    <div className="admin-shell min-h-screen bg-[#08090D] text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />

        <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1560px] w-full mx-auto space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2 border-b border-white/[0.05]">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100 font-display tracking-tight">Community & Feedback</h1>
              <p className="text-xs text-slate-400 mt-0.5">Review community star feedback logs and purge inappropriate discussion elements</p>
            </div>

            {/* Selector tabs */}
            <div className="flex gap-1 bg-[#11131A] border border-white/[0.06] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'reviews' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>User Reviews</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'comments' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Comments & Threads</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* List display */}
          <div className="space-y-3.5">
            {loading ? (
              <div className="text-center py-16 text-slate-500 text-xs">Querying moderation queue logs...</div>
            ) : activeTab === 'reviews' ? (
              reviews.length === 0 ? (
                <div className="text-center py-16 text-slate-500 bg-[#11131A] border border-white/[0.06] rounded-xl text-xs">
                  No user reviews have been recorded yet.
                </div>
              ) : (
                reviews.map((r) => (
                  <div key={r._id} className="bg-[#11131A] border border-white/[0.06] p-4 sm:p-5 rounded-xl flex items-start justify-between gap-4 hover:border-white/[0.12] transition">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span className="font-bold text-xs">{r.rating}/10</span>
                        </div>
                        <span className="text-slate-600 text-xs">•</span>
                        <span className="text-xs font-semibold text-slate-200">{r.user?.username || 'Anonymous Member'}</span>
                        <span className="text-[10px] text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{r.reviewText || 'No comment message written with rating.'}</p>
                      
                      <p className="text-[10px] font-mono text-slate-500">
                        Target Media: <b className="text-slate-400">{r.media?.title || r.mediaId}</b> ({r.mediaType || 'Media'})
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteReview(r._id)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-lg text-xs font-semibold transition flex-shrink-0"
                      title="Purge Review"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )
            ) : (
              comments.length === 0 ? (
                <div className="text-center py-16 text-slate-500 bg-[#11131A] border border-white/[0.06] rounded-xl text-xs">
                  No user comments or replies found.
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c._id} className="bg-[#11131A] border border-white/[0.06] p-4 sm:p-5 rounded-xl flex items-start justify-between gap-4 hover:border-white/[0.12] transition">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200">{c.user?.username || 'Member'}</span>
                        <span className="text-slate-600 text-xs">•</span>
                        <span className="text-[10px] text-slate-500">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{c.content}</p>

                      <p className="text-[10px] font-mono text-slate-500">
                        Target Resource: <b className="text-slate-400">{c.targetId}</b> ({c.targetType || 'General'})
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c._id)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-lg text-xs font-semibold transition flex-shrink-0"
                      title="Purge Comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
