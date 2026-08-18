'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import { useToast } from '@/features/admin/components/Toast';
import {
  TrendingUp, Film, Tv, Languages, Star, Users, Settings,
  Database, Trash2, MessageSquare, AlertTriangle, ShieldCheck
} from 'lucide-react';

export default function ReviewManager() {
  const { admin } = useAuth();
  const toast = useToast();
  
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
        setReviews(res.data);
      } else {
        const res = await apiClient.get('/api/admin/comments');
        setComments(res.data);
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
    <div className="min-h-screen bg-luxury-950 text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar />

      {/* Primary Details Panel */}
      <main className="flex-grow p-6 sm:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Discussions & Reviews</h1>
              <p className="text-slate-400 text-xs mt-1">Review community star feedback logs and purge inappropriate discussion elements</p>
            </div>

            {/* Selector tabs */}
            <div className="flex bg-luxury-900 border border-white/5 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                  activeTab === 'reviews' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                User Reviews
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                  activeTab === 'comments' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Comments
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* List display */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-16 text-slate-500">Checking records...</div>
            ) : activeTab === 'reviews' ? (
              // Reviews loop
              reviews.length === 0 ? (
                <p className="text-center py-16 text-slate-500 text-sm bg-luxury-900 border border-white/5 rounded-2xl">
                  No ratings or reviews submitted yet.
                </p>
              ) : (
                reviews.map((rev) => (
                  <div key={rev._id} className="bg-luxury-900 border border-white/5 p-5 rounded-2xl flex justify-between items-start gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-bold text-[9px]">
                          SCORE: {rev.rating}/10
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">TARGET ID: {rev.mediaId}</span>
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed font-serif italic">"{rev.content}"</p>
                      <div className="text-xs text-slate-500">
                        Submitted by: <b className="text-slate-400">{rev.user?.username || 'Unknown'}</b> ({rev.user?.email || 'N/A'}) on {new Date(rev.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteReview(rev._id)}
                      className="p-2 bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-secondary rounded-xl transition flex-shrink-0"
                      title="Purge Review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )
            ) : (
              // Comments loop
              comments.length === 0 ? (
                <p className="text-center py-16 text-slate-500 text-sm bg-luxury-900 border border-white/5 rounded-2xl">
                  No comments logged in target feeds.
                </p>
              ) : (
                comments.map((comm) => (
                  <div key={comm._id} className="bg-luxury-900 border border-white/5 p-5 rounded-2xl flex justify-between items-start gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] uppercase font-bold tracking-wider">
                          Type: {comm.targetType}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">TARGET ID: {comm.targetId}</span>
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed">"{comm.content}"</p>
                      
                      {comm.replies && comm.replies.length > 0 && (
                        <div className="pl-4 border-l border-white/5 space-y-1.5 mt-2">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase">Replies:</span>
                          {comm.replies.map((rep, rIdx) => (
                            <p key={rIdx} className="text-xs text-slate-400">
                              <span className="font-bold text-slate-300">User:</span> "{rep.content}"
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-slate-500">
                        Author: <b className="text-slate-400">{comm.user?.username || 'Unknown'}</b> ({comm.user?.email || 'N/A'}) on {new Date(comm.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(comm._id)}
                      className="p-2 bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-secondary rounded-xl transition flex-shrink-0"
                      title="Purge Comment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )
            )}
          </div>

        </div>
      </main>

    </div>
  );
}
