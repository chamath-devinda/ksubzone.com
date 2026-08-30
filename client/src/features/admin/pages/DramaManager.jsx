'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import DataTable from '@/features/admin/components/DataTable';
import ModalDrawer from '@/features/admin/components/ModalDrawer';
import { useToast } from '@/features/admin/components/Toast';
import {
  Tv,
  Film,
  Languages,
  Star,
  Trash2,
  Edit3,
  Plus,
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Image
} from 'lucide-react';

import SubtitleUploadModal from '@/features/media/components/SubtitleUploadModal';
import SubtitleManageModal from '@/features/media/components/SubtitleManageModal';

export default function DramaManager() {
  const { admin } = useAuth();
  const toast = useToast();
  
  const [mobileOpen, setMobileOpen] = useState(false);
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

  const [dramas, setDramas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter and pagination
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal triggers
  const [showDramaModal, setShowDramaModal] = useState(false);
  const [editingDrama, setEditingDrama] = useState(null);
  const [savingDrama, setSavingDrama] = useState(false);

  // Form State: Drama
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [poster, setPoster] = useState('');
  const [banner, setBanner] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [runtime, setRuntime] = useState('60');
  const [country, setCountry] = useState('KR');
  const [language, setLanguage] = useState('ko');
  const [director, setDirector] = useState('');
  const [trailer, setTrailer] = useState('');
  const [tmdbRating, setTmdbRating] = useState('8.0');
  const [imdbRating, setImdbRating] = useState('8.0');
  const [isTrending, setIsTrending] = useState(false);
  const [isHistorical, setIsHistorical] = useState(false);
  const [status, setStatus] = useState('Published');

  // Explorer modal
  const [explorerDrama, setExplorerDrama] = useState(null);
  const [expandedData, setExpandedData] = useState({ seasons: [], episodes: [] });
  const [loadingExpansion, setLoadingExpansion] = useState(false);

  // Season Modal State
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [editingSeason, setEditingSeason] = useState(null);
  const [seasonNumber, setSeasonNumber] = useState('1');
  const [seasonDescription, setSeasonDescription] = useState('');
  const [seasonPoster, setSeasonPoster] = useState('');
  const [savingSeason, setSavingSeason] = useState(false);

  // Episode Modal State
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [targetSeasonId, setTargetSeasonId] = useState(null);
  const [editingEpisode, setEditingEpisode] = useState(null);
  const [episodeNumber, setEpisodeNumber] = useState('1');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [episodeDescription, setEpisodeDescription] = useState('');
  const [episodeThumbnail, setEpisodeThumbnail] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [epAirDate, setEpAirDate] = useState('');
  const [epRuntime, setEpRuntime] = useState('60');
  const [savingEpisode, setSavingEpisode] = useState(false);

  const DRAMA_CACHE_KEY = 'admin_dramas_cache';

  const fetchDramas = async (selectedStatus = filterStatus, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/dramas?status=${selectedStatus}&limit=100`);
      const list = res.data.dramas || res.data || [];
      const fetched = Array.isArray(list) ? list : [];
      setDramas(fetched);
      try { sessionStorage.setItem(DRAMA_CACHE_KEY + '_' + selectedStatus, JSON.stringify(fetched)); } catch(_) {}
    } catch (err) {
      toast.error('Failed to fetch drama series.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(DRAMA_CACHE_KEY + '_' + filterStatus);
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

  // Explorer expander
  const handleOpenExplorer = async (drama) => {
    setExplorerDrama(drama);
    setLoadingExpansion(true);
    try {
      const res = await apiClient.get(`/api/admin/dramas/${drama._id}/structure`);
      setExpandedData({
        seasons: res.data.seasons || [],
        episodes: res.data.episodes || []
      });
    } catch (err) {
      toast.error('Failed to retrieve season catalog.');
      setExplorerDrama(null);
    } finally {
      setLoadingExpansion(false);
    }
  };

  const refreshExplorer = async () => {
    if (!explorerDrama) return;
    try {
      const res = await apiClient.get(`/api/admin/dramas/${explorerDrama._id}/structure`);
      setExpandedData({
        seasons: res.data.seasons || [],
        episodes: res.data.episodes || []
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Drama Actions
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
        toast.success('Drama series updated successfully.');
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

  // Season Actions
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
      toast.error('Season deletion failed.');
    }
  };

  // Episode Actions
  const handleOpenAddEpisode = (seasonId) => {
    setTargetSeasonId(seasonId);
    setEditingEpisode(null);
    const currCount = expandedData.episodes.filter(ep => ep.seasonId === seasonId).length;
    setEpisodeNumber(String(currCount + 1));
    setEpisodeTitle(`Episode ${currCount + 1}`);
    setEpisodeDescription('');
    setEpisodeThumbnail('');
    setVideoUrl('');
    setEpAirDate('');
    setEpRuntime('60');
    setShowEpisodeModal(true);
  };

  const handleOpenEditEpisode = (ep) => {
    setTargetSeasonId(ep.seasonId);
    setEditingEpisode(ep);
    setEpisodeNumber(String(ep.episodeNumber));
    setEpisodeTitle(ep.episodeTitle || '');
    setEpisodeDescription(ep.description || '');
    setEpisodeThumbnail(ep.thumbnail || '');
    setVideoUrl(ep.videoUrl || '');
    setEpAirDate(ep.airDate ? ep.airDate.split('T')[0] : '');
    setEpRuntime(ep.runtime ? String(ep.runtime) : '60');
    setShowEpisodeModal(true);
  };

  const handleEpisodeSubmit = async (e) => {
    e.preventDefault();
    setSavingEpisode(true);

    const payload = {
      seasonId: targetSeasonId,
      episodeNumber: Number(episodeNumber),
      episodeTitle,
      description: episodeDescription,
      thumbnail: episodeThumbnail,
      videoUrl,
      airDate: epAirDate ? new Date(epAirDate) : null,
      runtime: Number(epRuntime)
    };

    try {
      if (editingEpisode) {
        await apiClient.put(`/api/admin/episodes/${editingEpisode._id}`, payload);
        toast.success('Episode metadata updated.');
      } else {
        await apiClient.post('/api/admin/episodes', payload);
        toast.success('New episode published.');
      }
      setShowEpisodeModal(false);
      refreshExplorer();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Episode configuration error.');
    } finally {
      setSavingEpisode(false);
    }
  };

  const handleDeleteEpisode = async (episodeId) => {
    if (!window.confirm('Delete this episode and its connected subtitles?')) return;
    try {
      await apiClient.delete(`/api/admin/episodes/${episodeId}`);
      toast.success('Episode deleted.');
      refreshExplorer();
    } catch (err) {
      toast.error('Episode deletion failed.');
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Drama Title',
      sortable: true,
      render: (val, drama) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-12 rounded-md overflow-hidden bg-[#151821] border border-white/[0.06] flex-shrink-0">
            <img
              src={drama.poster || 'https://placehold.co/40x60?text=No+Poster'}
              alt={drama.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-slate-100 block text-xs truncate max-w-[260px]">{drama.title}</span>
            <span className="text-[10px] text-slate-500 font-mono block truncate">{drama.director || 'Unknown Director'}</span>
            <div className="flex gap-1.5 items-center mt-1 flex-wrap">
              {drama.isHistorical && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold uppercase">
                  Historical
                </span>
              )}
              <span className="px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.06] text-slate-400 text-[9px] font-bold uppercase font-mono">
                {drama.episodeCount || 0} eps
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'releaseDate',
      label: 'Release Year',
      sortable: true,
      render: (val) => <span className="font-mono text-xs text-slate-400">{val ? val.split('-')[0] : '—'}</span>
    },
    {
      key: 'imdbRating',
      label: 'IMDb',
      sortable: true,
      render: (val, row) => <span className="font-mono text-xs font-bold text-violet-400">{val || row.tmdbRating || '—'}</span>
    },
    {
      key: 'tmdbRating',
      label: 'TMDB',
      sortable: true,
      render: (val) => <span className="font-mono text-xs text-slate-400">{val || '—'}</span>
    },
    {
      key: 'viewCount',
      label: 'Views',
      sortable: true,
      render: (val) => <span className="font-mono text-xs text-slate-400">{val ? Number(val).toLocaleString() : 0}</span>
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          val === 'Published' 
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
            : val === 'Upcoming'
            ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
            : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
        }`}>
          {val || 'Draft'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, drama) => (
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenExplorer(drama)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#151821] hover:bg-violet-600/20 text-violet-400 rounded-lg border border-white/[0.06] transition text-[11px] font-semibold"
            title="Explore Seasons & Episodes"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Explorer</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenEditDrama(drama)}
            className="p-1.5 bg-[#151821] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 rounded-lg border border-white/[0.06] transition"
            title="Edit Series"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteDrama(drama._id)}
            className="p-1.5 bg-[#151821] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg border border-white/[0.06] transition"
            title="Delete Series"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="admin-shell min-h-screen bg-[#08090D] text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />

        <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1560px] w-full mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.05]">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100 font-display tracking-tight">Dramas & Series</h1>
              <p className="text-xs text-slate-400 mt-0.5">Manage series catalog, seasons structure, and episode subtitle targets</p>
            </div>
            
            <button
              type="button"
              onClick={handleOpenCreateDrama}
              className="flex h-9 items-center gap-1.5 px-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 rounded-lg text-xs font-semibold text-white shadow-sm transition active:scale-95 flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Drama
            </button>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex gap-1 bg-[#11131A] p-1 rounded-xl border border-white/[0.06] w-fit">
            {['All', 'Published', 'Upcoming', 'Draft'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterStatus === s
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
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
            searchKey="title"
          />

        </main>
      </div>

      {/* MODAL: DRAMA CREATE/EDIT */}
      <ModalDrawer
        isOpen={showDramaModal}
        onClose={() => setShowDramaModal(false)}
        title={editingDrama ? 'Modify Drama Series' : 'Register New Drama Series'}
        size="2xl"
      >
        <form onSubmit={handleDramaSubmit} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
            
            {/* Left Column: Storyline & Media Embeds */}
            <div className="space-y-4">
              {/* Series Information Card */}
              <div className="bg-[#151821] border border-white/[0.06] rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Series Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Drama Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                      placeholder="e.g. Queen of Tears"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Director</label>
                    <input
                      type="text"
                      value={director}
                      onChange={e => setDirector(e.target.value)}
                      className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                      placeholder="e.g. Park Ji-eun"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    URL Slug <span className="text-slate-500 font-normal font-mono text-[10px]">/drama/{slug || 'auto-generated'}</span>
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))}
                    placeholder="e.g. queen-of-tears-2024"
                    className="w-full px-3 py-2 bg-[#08090D] border border-violet-500/30 rounded-lg text-xs text-violet-400 font-mono outline-none focus:border-violet-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Synoptical Overview</label>
                  <textarea
                    rows="3"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition leading-relaxed resize-y"
                    placeholder="Storyline synopsis..."
                  />
                </div>
              </div>

              {/* Media Embeds Card */}
              <div className="bg-[#151821] border border-white/[0.06] rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-fuchsia-400 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5" /> Media Backdrop & Video
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Backdrop Banner URL</label>
                    <input
                      type="text"
                      value={banner}
                      onChange={e => setBanner(e.target.value)}
                      placeholder="https://image.tmdb.org/t/p/original/..."
                      className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Trailer Video URL (YouTube)</label>
                    <input
                      type="text"
                      value={trailer}
                      onChange={e => setTrailer(e.target.value)}
                      placeholder="https://www.youtube.com/embed/..."
                      className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Poster Preview & Release Setup */}
            <div className="space-y-4">
              {/* Poster Card with Live Preview */}
              <div className="bg-[#151821] border border-white/[0.06] rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5" /> Poster Image
                </h3>
                <div className="flex gap-3 items-start">
                  <div className="w-16 h-24 rounded-lg bg-[#08090D] border border-white/[0.08] overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {poster ? (
                      <img src={poster} alt="Poster" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <Film className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Poster URL</label>
                    <input
                      type="text"
                      value={poster}
                      onChange={e => setPoster(e.target.value)}
                      placeholder="https://image.tmdb.org/t/p/w500/..."
                      className="w-full px-2.5 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Live preview updates automatically</p>
                  </div>
                </div>
              </div>

              {/* Release Metadata Card */}
              <div className="bg-[#151821] border border-white/[0.06] rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" /> Release Metadata & Status
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Release Date</label>
                    <input
                      type="date"
                      value={releaseDate}
                      onChange={e => setReleaseDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Runtime (mins)</label>
                    <input
                      type="number"
                      value={runtime}
                      onChange={e => setRuntime(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">TMDB Rating</label>
                    <input
                      type="text"
                      value={tmdbRating}
                      onChange={e => setTmdbRating(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">IMDb Rating</label>
                    <input
                      type="text"
                      value={imdbRating}
                      onChange={e => setImdbRating(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.04]">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Language</label>
                    <input
                      type="text"
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                    >
                      <option value="Published">Published</option>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isHistorical}
                      onChange={e => setIsHistorical(e.target.checked)}
                      className="rounded border-white/20 bg-[#08090D] text-violet-600 focus:ring-0"
                    />
                    <span>Mark as Historical Drama</span>
                  </label>
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setShowDramaModal(false)}
              className="px-4 py-2 rounded-lg border border-white/[0.08] bg-[#151821] text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingDrama}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition disabled:opacity-50"
            >
              {savingDrama ? 'Saving Series...' : 'Save Series'}
            </button>
          </div>
        </form>
      </ModalDrawer>

      {/* ── SEASONS & EPISODES EXPLORER MODAL (REDESIGNED) ── */}
      <ModalDrawer
        isOpen={!!explorerDrama}
        onClose={() => setExplorerDrama(null)}
        title={explorerDrama ? `Series Explorer: ${explorerDrama.title}` : 'Seasons & Episodes Explorer'}
        size="xl"
      >
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div>
              <h4 className="text-sm font-bold text-slate-100 tracking-tight">Seasons & Episodes Structure</h4>
              <p className="text-xs text-slate-400 mt-0.5">Manage episodes and Sinhala subtitle targets for this drama series</p>
            </div>
            <button 
              type="button"
              onClick={handleOpenAddSeason}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 text-white font-semibold rounded-lg text-xs shadow-sm transition active:scale-95 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Add Season
            </button>
          </div>

          {loadingExpansion ? (
            <div className="text-xs text-slate-400 text-center py-12 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading seasons and episodes structure...</span>
            </div>
          ) : expandedData.seasons.length === 0 ? (
            <div className="text-center py-12 bg-[#151821] rounded-xl border border-white/[0.06] text-slate-400 text-xs space-y-2">
              <p className="font-semibold text-slate-300">No seasons defined yet</p>
              <p className="text-[11px] text-slate-500">Click the "+ Add Season" button above to begin adding episodes.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expandedData.seasons.map((season) => {
                const seasonEpisodes = expandedData.episodes
                  .filter(ep => ep.seasonId === season._id)
                  .sort((a, b) => Number(a.episodeNumber) - Number(b.episodeNumber));

                return (
                  <div key={season._id} className="border border-white/[0.06] rounded-xl p-4 bg-[#151821] space-y-3.5">
                    <div className="flex justify-between items-start gap-4 pb-2 border-b border-white/[0.04]">
                      <div>
                        <span className="font-bold text-xs text-violet-400 uppercase tracking-wider">
                          Season {season.seasonNumber}
                        </span>
                        <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                          {season.seasonDescription || 'Standard season sequence'}
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button 
                          type="button"
                          onClick={() => handleOpenAddEpisode(season._id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#11131A] hover:bg-violet-600/20 border border-white/[0.06] text-violet-300 rounded-lg text-xs font-semibold transition"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Ep
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleOpenEditSeason(season)}
                          className="p-1.5 bg-[#11131A] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 rounded-lg border border-white/[0.06] transition"
                          title="Edit Season"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteSeason(season._id)}
                          className="p-1.5 bg-[#11131A] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg border border-white/[0.06] transition"
                          title="Delete Season"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Episode List */}
                    <div className="space-y-1.5">
                      {seasonEpisodes.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2 text-center bg-[#11131A] rounded-lg border border-white/[0.04]">
                          No episodes in this season. Click "+ Add Ep" to create one.
                        </p>
                      ) : (
                        seasonEpisodes.map((ep) => (
                          <div
                            key={ep._id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between text-xs p-2.5 rounded-lg border border-white/[0.04] bg-[#11131A] hover:bg-[#13151D] transition gap-2.5"
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <span className="font-mono text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded flex-shrink-0">
                                EP {ep.episodeNumber}
                              </span>
                              <span className="text-slate-200 font-semibold truncate text-xs">
                                {ep.episodeTitle || `Episode ${ep.episodeNumber}`}
                              </span>
                              
                              {ep.subtitleCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => openSubtitleManage(ep._id, `S${season.seasonNumber} E${ep.episodeNumber}`)}
                                  className="px-1.5 py-0.2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase transition cursor-pointer flex-shrink-0"
                                >
                                  {ep.subtitleCount} Sub{ep.subtitleCount !== 1 ? 's' : ''}
                                </button>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-white/[0.04] text-slate-500 text-[9px] font-mono flex-shrink-0">
                                  No Sub
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 font-mono text-[11px] self-end sm:self-auto flex-shrink-0">
                              <span className="text-slate-500 text-[10px]">{ep.runtime || 60}m</span>
                              
                              <button
                                type="button"
                                onClick={() => openSubtitleUpload({
                                  mediaId: ep._id,
                                  mediaType: 'Episode',
                                  label: `S${season.seasonNumber} E${ep.episodeNumber}`,
                                  seasonNumber: season.seasonNumber,
                                  episodeNumber: ep.episodeNumber,
                                  seasonStatus: 'Ongoing'
                                })}
                                className="px-2 py-1 bg-[#151821] hover:bg-violet-600/20 text-violet-300 hover:text-white rounded border border-white/[0.06] flex items-center gap-1 font-semibold transition"
                                title="Upload Subtitle"
                              >
                                <UploadCloud className="w-3 h-3" />
                                <span>Sub</span>
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleOpenEditEpisode(ep)}
                                className="px-2 py-1 bg-[#151821] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 rounded border border-white/[0.06] transition"
                              >
                                Edit
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleDeleteEpisode(ep._id)}
                                className="px-2 py-1 bg-[#151821] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded border border-white/[0.06] transition"
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
        title={editingSeason ? 'Modify Season' : 'Add New Season'}
        size="sm"
      >
        <form onSubmit={handleSeasonSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Season Number</label>
            <input
              type="number"
              required
              value={seasonNumber}
              onChange={e => setSeasonNumber(e.target.value)}
              className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Season Description</label>
            <textarea
              rows="3"
              value={seasonDescription}
              onChange={e => setSeasonDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition leading-relaxed"
              placeholder="e.g. Main storyline continues..."
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Season Poster URL (Optional)</label>
            <input
              type="text"
              value={seasonPoster}
              onChange={e => setSeasonPoster(e.target.value)}
              className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setShowSeasonModal(false)}
              className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] bg-[#151821] text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingSeason}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition disabled:opacity-50"
            >
              {savingSeason ? 'Saving...' : 'Save Season'}
            </button>
          </div>
        </form>
      </ModalDrawer>

      {/* MODAL: EPISODE CREATE/EDIT */}
      <ModalDrawer
        isOpen={showEpisodeModal}
        onClose={() => setShowEpisodeModal(false)}
        title={editingEpisode ? 'Modify Episode' : 'Add New Episode'}
        size="lg"
      >
        <form onSubmit={handleEpisodeSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            
            {/* Left Column: Details */}
            <div className="bg-[#151821] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Ep Number</label>
                  <input
                    type="number"
                    required
                    value={episodeNumber}
                    onChange={e => setEpisodeNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Episode Title</label>
                  <input
                    type="text"
                    required
                    value={episodeTitle}
                    onChange={e => setEpisodeTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                    placeholder="e.g. Reunion"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Synopsis</label>
                <textarea
                  rows="4"
                  value={episodeDescription}
                  onChange={e => setEpisodeDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition leading-relaxed resize-y"
                  placeholder="Episode overview..."
                />
              </div>
            </div>

            {/* Right Column: Media Stream & Specs */}
            <div className="bg-[#151821] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Thumbnail URL</label>
                <input
                  type="text"
                  value={episodeThumbnail}
                  onChange={e => setEpisodeThumbnail(e.target.value)}
                  placeholder="https://image.tmdb.org/..."
                  className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Video Stream URL</label>
                <input
                  type="text"
                  required
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Air Date</label>
                  <input
                    type="date"
                    value={epAirDate}
                    onChange={e => setEpAirDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Runtime (mins)</label>
                  <input
                    type="number"
                    value={epRuntime}
                    onChange={e => setEpRuntime(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setShowEpisodeModal(false)}
              className="px-4 py-2 rounded-lg border border-white/[0.08] bg-[#151821] text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEpisode}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition disabled:opacity-50"
            >
              {savingEpisode ? 'Saving...' : 'Save Episode'}
            </button>
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
        target={uploadTarget}
        onSuccess={refreshExplorer}
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
        onChanged={refreshExplorer}
      />
    </div>
  );
}
