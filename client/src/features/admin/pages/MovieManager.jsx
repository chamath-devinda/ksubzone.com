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
  Film,
  Languages,
  Star,
  Trash2,
  Edit3,
  Plus,
  ShieldCheck,
  Calendar,
  Clock,
  Globe,
  Video,
  Eye,
  Image
} from 'lucide-react';

import SubtitleUploadModal from '@/features/media/components/SubtitleUploadModal';
import SubtitleManageModal from '@/features/media/components/SubtitleManageModal';

export default function MovieManager() {
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
  
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form modal triggers
  const [showModal, setShowModal] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);

  // Form Fields State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [poster, setPoster] = useState('');
  const [banner, setBanner] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [runtime, setRuntime] = useState('120');
  const [country, setCountry] = useState('KR');
  const [language, setLanguage] = useState('ko');
  const [director, setDirector] = useState('');
  const [trailer, setTrailer] = useState('');
  const [tmdbRating, setTmdbRating] = useState('8.0');
  const [imdbRating, setImdbRating] = useState('8.0');
  const [isTrending, setIsTrending] = useState(false);
  const [isHistorical, setIsHistorical] = useState(false);
  const [status, setStatus] = useState('Published');
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');

  const MOVIE_CACHE_KEY = 'admin_movies_cache';

  const fetchMovies = async (selectedStatus = filterStatus, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/movies?status=${selectedStatus}&limit=100`);
      const list = res.data.movies || res.data || [];
      const fetched = Array.isArray(list) ? list : [];
      setMovies(fetched);
      try { sessionStorage.setItem(MOVIE_CACHE_KEY + '_' + selectedStatus, JSON.stringify(fetched)); } catch(_) {}
    } catch (err) {
      toast.error('Failed to fetch movies catalog');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(MOVIE_CACHE_KEY + '_' + filterStatus);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMovies(parsed);
          setLoading(false);
          fetchMovies(filterStatus, true);
          return;
        }
      }
    } catch (_) {}
    fetchMovies(filterStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const handleOpenCreate = () => {
    setEditingMovie(null);
    setTitle('');
    setDescription('');
    setPoster('');
    setBanner('');
    setReleaseDate('');
    setRuntime('120');
    setCountry('KR');
    setLanguage('ko');
    setDirector('');
    setTrailer('');
    setTmdbRating('8.0');
    setImdbRating('8.0');
    setIsTrending(false);
    setIsHistorical(false);
    setStatus('Published');
    setShowModal(true);
  };

  const handleOpenEdit = (movie) => {
    setEditingMovie(movie);
    setTitle(movie.title || '');
    setDescription(movie.description || '');
    setPoster(movie.poster || '');
    setBanner(movie.banner || '');
    setReleaseDate(movie.releaseDate ? movie.releaseDate.split('T')[0] : '');
    setRuntime(movie.runtime ? String(movie.runtime) : '120');
    setCountry(movie.country || 'KR');
    setLanguage(movie.language || 'ko');
    setDirector(movie.director || '');
    setTrailer(movie.trailer || '');
    setTmdbRating(movie.tmdbRating ? String(movie.tmdbRating) : '8.0');
    setImdbRating(movie.imdbRating ? String(movie.imdbRating) : String(movie.tmdbRating || '8.0'));
    setIsTrending(Boolean(movie.isTrending));
    setIsHistorical(Boolean(movie.isHistorical));
    setStatus(movie.status || 'Published');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      title,
      description,
      poster,
      banner,
      releaseDate: releaseDate ? new Date(releaseDate) : null,
      runtime: Number(runtime),
      country,
      language,
      director,
      trailer,
      tmdbRating: Number(tmdbRating),
      imdbRating: Number(imdbRating),
      status,
      isHistorical
    };

    try {
      if (editingMovie) {
        await apiClient.put(`/api/admin/movies/${editingMovie._id}`, payload);
        toast.success('Movie details updated successfully.');
      } else {
        await apiClient.post('/api/admin/movies', payload);
        toast.success('New movie entry created successfully.');
      }
      setShowModal(false);
      fetchMovies(filterStatus, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save movie details.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to delete this movie record?')) return;
    try {
      await apiClient.delete(`/api/admin/movies/${id}`);
      toast.success('Movie record deleted successfully.');
      fetchMovies(filterStatus, true);
    } catch (err) {
      toast.error('Failed to delete movie record.');
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Movie Title',
      sortable: true,
      render: (val, movie) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-12 rounded-md overflow-hidden bg-[#151821] border border-white/[0.06] flex-shrink-0">
            <img
              src={movie.poster || 'https://placehold.co/40x60?text=No+Poster'}
              alt={movie.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-slate-100 block text-xs truncate max-w-[280px]">{movie.title}</span>
            <span className="text-[10px] text-slate-500 font-mono block truncate">{movie.director || 'Unknown Director'}</span>
            <div className="flex gap-1.5 items-center mt-1 flex-wrap">
              {movie.isHistorical && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold uppercase">
                  Historical
                </span>
              )}
              {movie.subtitleCount > 0 ? (
                <button
                  type="button"
                  onClick={() => openSubtitleManage(movie._id, movie.title)}
                  className="px-1.5 py-0.2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 text-[9px] font-bold uppercase transition cursor-pointer"
                >
                  {movie.subtitleCount} Sub{movie.subtitleCount !== 1 ? 's' : ''}
                </button>
              ) : (
                <span className="px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.06] text-slate-500 text-[9px] font-bold uppercase font-mono">
                  0 Subs
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
      render: (_, movie) => (
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => openSubtitleUpload({
              mediaId: movie._id,
              mediaType: 'Movie',
              label: movie.title
            })}
            className="p-1.5 bg-[#151821] hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 rounded-lg border border-white/[0.06] transition"
            title="Upload Subtitle"
          >
            <Languages className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenEdit(movie)}
            className="p-1.5 bg-[#151821] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 rounded-lg border border-white/[0.06] transition"
            title="Edit Movie"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(movie._id)}
            className="p-1.5 bg-[#151821] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg border border-white/[0.06] transition"
            title="Delete Movie"
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
              <h1 className="text-2xl font-extrabold text-slate-100 font-display tracking-tight">Movies Library</h1>
              <p className="text-xs text-slate-400 mt-0.5">Manage film database records, ratings, and video assets</p>
            </div>
            
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex h-9 items-center gap-1.5 px-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 rounded-lg text-xs font-semibold text-white shadow-sm transition active:scale-95 flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Movie
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
            data={movies}
            loading={loading}
            searchPlaceholder="Search movies by title or director..."
            searchKey="title"
          />

        </main>
      </div>

      {/* Manual Creation / Edit Drawer Modal */}
      <ModalDrawer
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingMovie ? 'Modify Movie Record' : 'Register New Movie'}
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
            
            {/* Left Column: Information & Embeds */}
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="bg-[#151821] border border-white/[0.06] rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Basic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Movie Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                      placeholder="e.g. Wonderland"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Director</label>
                    <input
                      type="text"
                      value={director}
                      onChange={e => setDirector(e.target.value)}
                      className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                      placeholder="e.g. Kim Tae-yong"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Synoptical Description</label>
                  <textarea
                    rows="3"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition leading-relaxed resize-y"
                    placeholder="Overview of the movie storyline..."
                  />
                </div>
              </div>

              {/* Media Backdrop & Trailer */}
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
                      className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                      placeholder="https://image.tmdb.org/t/p/original/..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Trailer Video URL (YouTube)</label>
                    <input
                      type="text"
                      value={trailer}
                      onChange={e => setTrailer(e.target.value)}
                      className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 transition"
                      placeholder="https://www.youtube.com/embed/..."
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
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-lg border border-white/[0.08] bg-[#151821] text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition disabled:opacity-50"
            >
              {saving ? 'Saving Movie...' : 'Save Movie'}
            </button>
          </div>
        </form>
      </ModalDrawer>

      {/* Subtitle Quick Upload Modal */}
      {uploadModalOpen && (
        <SubtitleUploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          target={uploadTarget}
          onSuccess={() => fetchMovies(filterStatus, true)}
        />
      )}

      {/* Subtitle Manage Modal */}
      {manageModalOpen && (
        <SubtitleManageModal
          isOpen={manageModalOpen}
          onClose={() => setManageModalOpen(false)}
          mediaId={manageTarget?.mediaId}
          label={manageTarget?.label}
          onChanged={() => fetchMovies(filterStatus, true)}
        />
      )}
    </div>
  );
}
