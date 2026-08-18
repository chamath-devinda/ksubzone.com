'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import DataTable from '@/features/admin/components/DataTable';
import ModalDrawer from '@/features/admin/components/ModalDrawer';
import { useToast } from '@/features/admin/components/Toast';
import {
  Tv, Languages, Star, Trash2, Edit3, Plus, ShieldCheck, ChevronRight, ChevronDown, UploadCloud, Film
} from 'lucide-react';
import SubtitleUploadModal from '@/features/media/components/SubtitleUploadModal';
import SubtitleManageModal from '@/features/media/components/SubtitleManageModal';

export default function DramaManager() {
  const { admin } = useAuth();
  const toast = useToast();
  
  const [dramas, setDramas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Explorer Target
  const [explorerDrama, setExplorerDrama] = useState(null);
  const [expandedData, setExpandedData] = useState({ seasons: [], episodes: [] });
  const [loadingExpansion, setLoadingExpansion] = useState(false);

  // Modals controllers
  const [showDramaModal, setShowDramaModal] = useState(false);
  const [editingDrama, setEditingDrama] = useState(null);

  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [editingSeason, setEditingSeason] = useState(null);

  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState(null);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState(null);

  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [manageTarget, setManageTarget] = useState(null);

  const openSubtitleUpload = (target) => {
    setUploadTarget(target);
    setUploadModalOpen(true);
  };

  const openSubtitleManage = (mediaId, label) => {
    setManageTarget({ mediaId, label });
    setManageModalOpen(true);
  };

  // Drama Fields State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [poster, setPoster] = useState('');
  const [banner, setBanner] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [runtime, setRuntime] = useState('');
  const [country, setCountry] = useState('KR');
  const [language, setLanguage] = useState('ko');
  const [director, setDirector] = useState('');
  const [trailer, setTrailer] = useState('');
  const [tmdbRating, setTmdbRating] = useState('8.0');
  const [imdbRating, setImdbRating] = useState('8.0');
  const [slug, setSlug] = useState('');
  const [isTrending, setIsTrending] = useState(false);
  const [isHistorical, setIsHistorical] = useState(false);
  const [status, setStatus] = useState('Published');
  const [savingDrama, setSavingDrama] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');

  // Season Fields State
  const [seasonNumber, setSeasonNumber] = useState('');
  const [seasonDescription, setSeasonDescription] = useState('');
  const [seasonPoster, setSeasonPoster] = useState('');
  const [savingSeason, setSavingSeason] = useState(false);

  // Episode Fields State
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [episodeDescription, setEpisodeDescription] = useState('');
  const [episodeThumbnail, setEpisodeThumbnail] = useState('');
  const [epAirDate, setEpAirDate] = useState('');
  const [epRuntime, setEpRuntime] = useState('60');
  const [videoUrl, setVideoUrl] = useState('https://www.w3schools.com/html/mov_bbb.mp4');
  const [savingEpisode, setSavingEpisode] = useState(false);

  const CACHE_KEY = 'admin_dramas_cache';

  const fetchDramas = async (selectedStatus = filterStatus, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/dramas?status=${selectedStatus}&limit=200`);
      const list = res.data.dramas || res.data || [];
      const fetched = Array.isArray(list) ? list : [];
      setDramas(fetched);
      try { sessionStorage.setItem(CACHE_KEY + '_' + selectedStatus, JSON.stringify(fetched)); } catch(_) {}
    } catch (err) {
      toast.error('Failed to fetch dramas catalog.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY + '_' + filterStatus);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDramas(parsed);
          setLoading(false);
          fetchDramas(filterStatus, true);
          return;
        }
      }
    } catch (_) {}
    fetchDramas(filterStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const handleOpenExplorer = async (drama) => {
    setExplorerDrama(drama);
    
    const preloadedSeasons = drama.seasons || [];
    const preloadedEpisodes = drama.episodes || [];
    
    if (preloadedSeasons.length > 0) {
      setExpandedData({
        seasons: preloadedSeasons,
        episodes: preloadedEpisodes
      });
    } else {
      setLoadingExpansion(true);
    }

    try {
      const res = await apiClient.get(`/api/media/dramas/${drama.slug}`);
      const freshSeasons = res.data.seasons || [];
      const freshEpisodes = res.data.episodes || [];
      
      setExpandedData({
        seasons: freshSeasons,
        episodes: freshEpisodes
      });

      // Update the preloaded data in the dramas catalog list
      setDramas(prev => prev.map(d => d._id === drama._id ? {
        ...d,
        seasons: freshSeasons,
        episodes: freshEpisodes
      } : d));
    } catch (err) {
      if (preloadedSeasons.length === 0) {
        toast.error('Failed to load season structure.');
      }
    } finally {
      setLoadingExpansion(false);
    }
  };

  const refreshExplorer = async () => {
    if (!explorerDrama) return;
    try {
      const res = await apiClient.get(`/api/media/dramas/${explorerDrama.slug}?t=${Date.now()}`);
      const freshSeasons = res.data.seasons || [];
      const freshEpisodes = res.data.episodes || [];
      
      setExpandedData({
        seasons: freshSeasons,
        episodes: freshEpisodes
      });

      // Update the preloaded data in the dramas catalog list as well
      setDramas(prev => prev.map(d => d._id === explorerDrama._id ? {
        ...d,
        seasons: freshSeasons,
        episodes: freshEpisodes
      } : d));
    } catch (err) {
      console.error(err);
    }
  };

  // --- DRAMA ACTIONS ---
  const handleOpenCreateDrama = () => {
    setEditingDrama(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setPoster('');
    setBanner('');
    setReleaseDate('');
    setRuntime('60');
    setCountry('KR');
    setLanguage('ko');
    setDirector('');
    setTrailer('');
    setTmdbRating('8.0');
    setImdbRating('8.0');
    setIsTrending(false);
    setIsHistorical(false);
    setStatus('Published');
    setShowDramaModal(true);
  };

  const handleOpenEditDrama = (drama) => {
    setEditingDrama(drama);
    setTitle(drama.title || '');
    setSlug(drama.slug || '');
    setDescription(drama.description || '');
    setPoster(drama.poster || '');
    setBanner(drama.banner || '');
    setReleaseDate(drama.releaseDate ? drama.releaseDate.split('T')[0] : '');
    setRuntime(drama.runtime ? String(drama.runtime) : '60');
    setCountry(drama.country || 'KR');
    setLanguage(drama.language || 'ko');
    setDirector(drama.director || '');
    setTrailer(drama.trailer || '');
    setTmdbRating(drama.tmdbRating ? String(drama.tmdbRating) : '8.0');
    setImdbRating(drama.imdbRating ? String(drama.imdbRating) : String(drama.tmdbRating || '8.0'));
    setIsTrending(Boolean(drama.isTrending));
    setIsHistorical(Boolean(drama.isHistorical));
    setStatus(drama.status || 'Published');
    setShowDramaModal(true);
  };

  const handleDramaSubmit = async (e) => {
    e.preventDefault();
    setSavingDrama(true);

    const payload = {
      title, description, poster, banner,
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || undefined,
      releaseDate: releaseDate ? releaseDate : null,
      runtime: Number(runtime), country, language, director, trailer,
      tmdbRating: Number(tmdbRating), imdbRating: Number(imdbRating), status, isHistorical
    };

    try {
      if (editingDrama) {
        await apiClient.put(`/api/admin/dramas/${editingDrama._id}`, payload);
        toast.success('Drama series settings updated successfully.');
      } else {
        await apiClient.post('/api/admin/dramas', payload);
        toast.success('New Drama series registered successfully.');
      }
      setShowDramaModal(false);
      fetchDramas(filterStatus, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save drama configuration.');
    } finally {
      setSavingDrama(false);
    }
  };

  const handleDeleteDrama = async (id) => {
    if (!window.confirm('WARNING: Deleting a drama will delete all cascading seasons and episodes! Are you absolutely sure?')) return;
    try {
      await apiClient.delete(`/api/admin/dramas/${id}`);
      toast.success('Drama series deleted successfully.');
      fetchDramas(filterStatus, true);
    } catch (err) {
      toast.error('Failed to delete drama series.');
    }
  };

  // --- SEASON ACTIONS ---
  const handleOpenAddSeason = () => {
    setEditingSeason(null);
    setSeasonNumber(String(expandedData.seasons.length + 1));
    setSeasonDescription('');
    setSeasonPoster('');
    setShowSeasonModal(true);
  };

  const handleOpenEditSeason = (season) => {
    setEditingSeason(season);
    setSeasonNumber(String(season.seasonNumber));
    setSeasonDescription(season.seasonDescription || '');
    setSeasonPoster(season.seasonPoster || '');
    setShowSeasonModal(true);
  };

  const handleSeasonSubmit = async (e) => {
    e.preventDefault();
    setSavingSeason(true);

    const payload = {
      dramaId: explorerDrama._id,
      seasonNumber: Number(seasonNumber),
      seasonDescription,
      seasonPoster
    };

    try {
      if (editingSeason) {
        await apiClient.put(`/api/admin/seasons/${editingSeason._id}`, payload);
        toast.success('Season settings updated.');
      } else {
        await apiClient.post('/api/admin/seasons', payload);
        toast.success('New Season registered.');
      }
      setShowSeasonModal(false);
      refreshExplorer();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Season setup failed.');
    } finally {
      setSavingSeason(false);
    }
  };

  const handleDeleteSeason = async (seasonId) => {
    if (!window.confirm('Delete season and all its episodes?')) return;
    try {
      await apiClient.delete(`/api/admin/seasons/${seasonId}`);
      toast.success('Season deleted.');
      refreshExplorer();
    } catch (err) {
      toast.error('Delete season operation failed.');
    }
  };

  // --- EPISODE ACTIONS ---
  const handleOpenAddEpisode = (seasonId) => {
    setEditingEpisode(null);
    setSelectedSeasonId(seasonId);
    setEpisodeNumber('');
    setEpisodeTitle('');
    setEpisodeDescription('');
    setEpisodeThumbnail('');
    setEpAirDate('');
    setEpRuntime('60');
    setVideoUrl('https://www.w3schools.com/html/mov_bbb.mp4');
    setShowEpisodeModal(true);
  };

  const handleOpenEditEpisode = (episode) => {
    setEditingEpisode(episode);
    setSelectedSeasonId(episode.seasonId);
    setEpisodeNumber(String(episode.episodeNumber));
    setEpisodeTitle(episode.episodeTitle || '');
    setEpisodeDescription(episode.episodeDescription || '');
    setEpisodeThumbnail(episode.episodeThumbnail || '');
    setEpAirDate(episode.airDate ? episode.airDate.split('T')[0] : '');
    setEpRuntime(episode.runtime ? String(episode.runtime) : '60');
    setVideoUrl(episode.videoUrl || '');
    setShowEpisodeModal(true);
  };

  const handleEpisodeSubmit = async (e) => {
    e.preventDefault();
    setSavingEpisode(true);

    const payload = {
      dramaId: explorerDrama._id,
      seasonId: selectedSeasonId,
      episodeNumber: Number(episodeNumber),
      episodeTitle,
      episodeDescription,
      episodeThumbnail,
      airDate: epAirDate ? new Date(epAirDate) : null,
      runtime: Number(epRuntime),
      videoUrl
    };

    try {
      if (editingEpisode) {
        await apiClient.put(`/api/admin/episodes/${editingEpisode._id}`, payload);
        toast.success('Episode details saved.');
      } else {
        await apiClient.post('/api/admin/episodes', payload);
        toast.success('New Episode registered.');
      }
      setShowEpisodeModal(false);
      refreshExplorer();
    } catch (err) {
      toast.error('Failed to save episode details.');
    } finally {
      setSavingEpisode(false);
    }
  };

  const handleDeleteEpisode = async (epId) => {
    if (!window.confirm('Delete this episode?')) return;
    try {
      await apiClient.delete(`/api/admin/episodes/${epId}`);
      toast.success('Episode deleted.');
      refreshExplorer();
    } catch (err) {
      toast.error('Delete episode failed.');
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Drama Series',
      sortable: true,
      render: (val, drama) => (
        <div className="flex items-center gap-3">
          <img
            src={drama.poster || 'https://placehold.co/40x60'}
            alt={drama.title}
            className="w-9 h-13 object-cover rounded bg-luxury-950 border border-white/5 flex-shrink-0"
          />
          <div>
            <span className="font-extrabold text-slate-200 block text-sm">{drama.title}</span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">{drama.director || 'Unknown Director'}</span>
            <div className="flex gap-1.5 items-center mt-1.5 flex-wrap">
              {drama.isHistorical && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold uppercase tracking-wider">
                  Historical
                </span>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'releaseDate',
      label: 'Release Year',
      sortable: true,
      render: (val) => <span className="font-mono text-slate-400">{val ? val.split('-')[0] : 'N/A'}</span>
    },
    {
      key: 'imdbRating',
      label: 'IMDb',
      sortable: true,
      render: (val, row) => <span className="font-mono font-bold text-brand-primary">{val || row.tmdbRating || '0.0'}</span>
    },
    {
      key: 'tmdbRating',
      label: 'TMDB',
      sortable: true,
      render: (val) => <span className="font-mono text-slate-400">{val || '0.0'}</span>
    },
    {
      key: 'viewCount',
      label: 'Views',
      sortable: true,
      render: (val) => <span className="font-mono text-slate-400">{val || 0}</span>
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => (
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
          val === 'Published' 
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
            : val === 'Upcoming'
            ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
            : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
        }`}>
          {val || 'Draft'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, drama) => (
        <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handleOpenExplorer(drama)}
            className="px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded-lg transition text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
            title="Explore Seasons & Episodes"
          >
            <Tv className="w-3.5 h-3.5" /> Explorer
          </button>
          <button
            onClick={() => handleOpenEditDrama(drama)}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition"
            title="Edit Series"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteDrama(drama._id)}
            className="p-1.5 bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-secondary rounded-lg transition"
            title="Delete Series"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-luxury-950 text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar />

      <main className="flex-grow p-6 sm:p-8 overflow-y-auto min-w-0">
        <div className="max-w-5xl mx-auto">
          
          <div className="flex justify-between items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Manage K-Dramas</h1>
              <p className="text-slate-400 text-xs mt-1">Manage series settings, seasons metadata, and episode subtitle targets</p>
            </div>
            
            <button
              onClick={handleOpenCreateDrama}
              className="px-4 py-2.5 bg-brand-primary hover:bg-opacity-90 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 flex-shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Drama
            </button>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex gap-2 mb-6 bg-luxury-900/50 p-1.5 rounded-xl border border-white/5 w-fit">
            {['All', 'Published', 'Upcoming', 'Draft'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  filterStatus === s
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Reusable DataTable */}
          <DataTable
            columns={columns}
            data={dramas}
            loading={loading}
            searchPlaceholder="Search drama series by title..."
          />

        </div>
      </main>

      {/* MODAL: DRAMA CREATE/EDIT */}
      <ModalDrawer
        isOpen={showDramaModal}
        onClose={() => setShowDramaModal(false)}
        title={editingDrama ? 'Modify Drama Series' : 'Create Drama Series'}
        size="lg"
      >
        <form onSubmit={handleDramaSubmit} className="space-y-5">
          <div className="bg-luxury-950/40 border border-white/5 rounded-2xl p-4.5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-brand-primary mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Series Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Drama Title</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Director</label>
                <input type="text" value={director} onChange={e => setDirector(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                URL Slug
                <span className="ml-2 text-slate-500 font-normal normal-case font-mono">/drama/{slug || 'auto-generated'}</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))}
                placeholder="e.g. Moving-2023"
                className="w-full px-3.5 py-2.5 bg-luxury-950 border border-brand-primary/30 rounded-xl text-xs outline-none text-brand-primary font-mono focus:border-brand-primary transition"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Synoptical Overview</label>
              <textarea rows="3" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition leading-relaxed" />
            </div>
          </div>

          <div className="bg-luxury-950/40 border border-white/5 rounded-2xl p-4.5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-brand-secondary mb-2 flex items-center gap-2">
              <Film className="w-4 h-4" /> Cover & Trailer Assets
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Poster URL</label>
                <input type="text" value={poster} onChange={e => setPoster(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Banner URL</label>
                <input type="text" value={banner} onChange={e => setBanner(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Trailer Video URL (YouTube embed)</label>
              <input type="text" value={trailer} onChange={e => setTrailer(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
            </div>
          </div>

          <div className="bg-luxury-950/40 border border-white/5 rounded-2xl p-4.5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-2 flex items-center gap-2">
              <Star className="w-4 h-4" /> Release metadata & Flags
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Release Date</label>
                <input type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:border-brand-primary transition" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Ep Runtime (mins)</label>
                <input type="number" value={runtime} onChange={e => setRuntime(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">TMDB Rating</label>
                <input type="text" value={tmdbRating} onChange={e => setTmdbRating(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">IMDb Rating</label>
                <input type="text" value={imdbRating} onChange={e => setImdbRating(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Country</label>
                <input type="text" value={country} onChange={e => setCountry(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Language</label>
                <input type="text" value={language} onChange={e => setLanguage(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Publish Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition"
                >
                  <option value="Published">Published</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input type="checkbox" checked={isHistorical} onChange={e => setIsHistorical(e.target.checked)} className="w-4 h-4 accent-brand-primary rounded bg-luxury-950 border-white/10" />
                Mark as Historical Drama
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
            <button type="button" onClick={() => setShowDramaModal(false)} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-300 transition">Cancel</button>
            <button type="submit" disabled={savingDrama} className="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider transition">{savingDrama ? 'Saving...' : 'Save Series'}</button>
          </div>
        </form>
      </ModalDrawer>

      {/* DETAILED SEASONS & EPISODES EXPLORER MODAL */}
      <ModalDrawer
        isOpen={!!explorerDrama}
        onClose={() => setExplorerDrama(null)}
        title={explorerDrama ? `Explorer: ${explorerDrama.title}` : 'Seasons & Episodes Explorer'}
        size="xl"
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Seasons & Episodes structure</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Manage episodes and subtitles templates for this drama</p>
            </div>
            <button 
              onClick={handleOpenAddSeason}
              className="px-4.5 py-2.5 bg-brand-primary hover:bg-opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition"
            >
              + Add Season
            </button>
          </div>

          {loadingExpansion ? (
            <div className="text-xs text-slate-500 text-center py-10">Checking seasons catalog structure...</div>
          ) : expandedData.seasons.length === 0 ? (
            <div className="text-center py-10 bg-luxury-950/30 rounded-xl border border-white/5 text-slate-500 text-xs">
              No seasons defined. Add a season using the "+ Add Season" button to start creating episodes.
            </div>
          ) : (
            <div className="space-y-4">
              {expandedData.seasons.map((season) => {
                const seasonEpisodes = expandedData.episodes
                  .filter(ep => ep.seasonId === season._id)
                  .sort((a, b) => Number(a.episodeNumber) - Number(b.episodeNumber));
                return (
                  <div key={season._id} className="border border-white/5 rounded-2xl p-5 bg-luxury-900 bg-opacity-20 space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h6 className="font-extrabold text-xs text-brand-primary uppercase tracking-wider">Season {season.seasonNumber}</h6>
                        <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{season.seasonDescription || 'No description provided.'}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button 
                          onClick={() => handleOpenAddEpisode(season._id)}
                          className="px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/10 text-brand-primary rounded-lg text-[10px] font-bold uppercase transition"
                        >
                          + Add Ep
                        </button>
                        <button 
                          onClick={() => handleOpenEditSeason(season)}
                          className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg transition"
                          title="Edit Season"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteSeason(season._id)}
                          className="p-1.5 bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-secondary rounded-lg transition"
                          title="Delete Season"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Episode List */}
                    <div className="pl-4 border-l border-white/5 space-y-2">
                      {seasonEpisodes.length === 0 ? (
                        <p className="text-[10px] text-slate-500 py-1">No episodes created.</p>
                      ) : (
                        seasonEpisodes.map((ep) => (
                          <div key={ep._id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs p-2.5 rounded-xl border border-white/[0.02] bg-white/[0.01] hover:bg-white/[0.03] transition gap-3">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <Languages className={`w-3.5 h-3.5 flex-shrink-0 ${ep.subtitleCount > 0 ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}`} />
                              <span className="font-bold font-mono text-[10px] text-brand-secondary flex-shrink-0">EP {ep.episodeNumber}:</span>
                              <span className="text-slate-200 font-semibold truncate">{ep.episodeTitle}</span>
                              
                              {ep.subtitleCount > 0 && (
                                <button
                                  onClick={() => openSubtitleManage(ep._id, `S${season.seasonNumber} E${ep.episodeNumber}`)}
                                  className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[8px] font-bold uppercase tracking-wider transition cursor-pointer flex-shrink-0"
                                >
                                  {ep.subtitleCount} Sub{ep.subtitleCount !== 1 ? 's' : ''}
                                </button>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 font-mono text-[10px] self-end sm:self-auto flex-shrink-0">
                              <span className="text-slate-500">{ep.runtime || 60}m</span>
                              <button
                                onClick={() => openSubtitleUpload({
                                  mediaId: ep._id,
                                  mediaType: 'Episode',
                                  label: `S${season.seasonNumber} E${ep.episodeNumber}`,
                                  seasonNumber: season.seasonNumber,
                                  episodeNumber: ep.episodeNumber,
                                  seasonStatus: 'Ongoing'
                                })}
                                className="text-brand-primary hover:text-white flex items-center gap-1 font-bold transition"
                                title="Upload Subtitle"
                              >
                                <UploadCloud className="w-3.5 h-3.5" /> Sub
                              </button>
                              <button 
                                onClick={() => handleOpenEditEpisode(ep)}
                                className="text-slate-400 hover:text-white transition"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteEpisode(ep._id)}
                                className="text-brand-secondary hover:text-red-400 transition"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ModalDrawer>

      {/* MODAL: SEASON CREATE/EDIT */}
      <ModalDrawer
        isOpen={showSeasonModal}
        onClose={() => setShowSeasonModal(false)}
        title={editingSeason ? 'Modify Season' : 'Create Season'}
        size="sm"
      >
        <form onSubmit={handleSeasonSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Season Number</label>
            <input type="number" required value={seasonNumber} onChange={e => setSeasonNumber(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Season Description</label>
            <textarea rows="3" value={seasonDescription} onChange={e => setSeasonDescription(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition leading-relaxed" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Season Poster URL (Optional)</label>
            <input type="text" value={seasonPoster} onChange={e => setSeasonPoster(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button type="button" onClick={() => setShowSeasonModal(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-300 transition">Cancel</button>
            <button type="submit" disabled={savingSeason} className="px-6 py-2 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider transition">{savingSeason ? 'Saving...' : 'Save Season'}</button>
          </div>
        </form>
      </ModalDrawer>

      {/* MODAL: EPISODE CREATE/EDIT */}
      <ModalDrawer
        isOpen={showEpisodeModal}
        onClose={() => setShowEpisodeModal(false)}
        title={editingEpisode ? 'Modify Episode' : 'Create Episode'}
        size="md"
      >
        <form onSubmit={handleEpisodeSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Episode Number</label>
              <input type="number" required value={episodeNumber} onChange={e => setEpisodeNumber(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Episode Title</label>
              <input type="text" required value={episodeTitle} onChange={e => setEpisodeTitle(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Synopsis</label>
            <textarea rows="3" value={episodeDescription} onChange={e => setEpisodeDescription(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition leading-relaxed" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Thumbnail URL</label>
              <input type="text" value={episodeThumbnail} onChange={e => setEpisodeThumbnail(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Video Stream URL</label>
              <input type="text" required value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Air Date</label>
              <input type="date" value={epAirDate} onChange={e => setEpAirDate(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs text-slate-200 focus:border-brand-primary transition" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Runtime (mins)</label>
              <input type="number" value={epRuntime} onChange={e => setEpRuntime(e.target.value)} className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-xs outline-none text-slate-200 focus:border-brand-primary transition" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button type="button" onClick={() => setShowEpisodeModal(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-300 transition">Cancel</button>
            <button type="submit" disabled={savingEpisode} className="px-6 py-2 bg-brand-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider transition">{savingEpisode ? 'Saving...' : 'Save Episode'}</button>
          </div>
        </form>
      </ModalDrawer>

      {/* Subtitle Uploader Modal Box */}
      <SubtitleUploadModal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setUploadTarget(null);
        }}
        mediaId={uploadTarget?.mediaId}
        mediaType={uploadTarget?.mediaType || 'Episode'}
        targetMeta={uploadTarget || { label: 'Episode' }}
        onUploadSuccess={refreshExplorer}
      />

      {/* Subtitle Management Modal Box */}
      <SubtitleManageModal
        isOpen={manageModalOpen}
        onClose={() => {
          setManageModalOpen(false);
          setManageTarget(null);
        }}
        mediaId={manageTarget?.mediaId}
        label={manageTarget?.label}
        onDeleteSuccess={refreshExplorer}
      />
    </div>
  );
}
