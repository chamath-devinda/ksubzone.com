'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import DataTable from '@/features/admin/components/DataTable';
import ModalDrawer from '@/features/admin/components/ModalDrawer';
import { useToast } from '@/features/admin/components/Toast';
import {
  Film, Languages, Star, Trash2, Edit3, Plus, ShieldCheck
} from 'lucide-react';

import SubtitleUploadModal from '@/features/media/components/SubtitleUploadModal';
import SubtitleManageModal from '@/features/media/components/SubtitleManageModal';

export default function MovieManager() {
  const { admin } = useAuth();
  const toast = useToast();
  
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
  const [runtime, setRuntime] = useState('');
  const [country, setCountry] = useState('KR');
  const [language, setLanguage] = useState('ko');
  const [director, setDirector] = useState('');
  const [trailer, setTrailer] = useState('');
  const [tmdbRating, setTmdbRating] = useState('');
  const [imdbRating, setImdbRating] = useState('');
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
          <img
            src={movie.poster || 'https://placehold.co/40x60'}
            alt={movie.title}
            className="w-9 h-13 object-cover rounded bg-luxury-950 border border-white/5 flex-shrink-0"
          />
          <div>
            <span className="font-extrabold text-slate-200 block text-sm">{movie.title}</span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">{movie.director || 'Unknown Director'}</span>
            <div className="flex gap-1.5 items-center mt-1.5 flex-wrap">
              {movie.isHistorical && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold uppercase tracking-wider">
                  Historical
                </span>
              )}
              {movie.subtitleCount > 0 ? (
                <button
                  onClick={() => openSubtitleManage(movie._id, movie.title)}
                  className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  {movie.subtitleCount} Sub{movie.subtitleCount !== 1 ? 's' : ''}
                </button>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-slate-500/10 border border-white/5 text-slate-400 text-[9px] font-bold uppercase tracking-wider font-mono">
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
      render: (_, movie) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => openSubtitleUpload({
              mediaId: movie._id,
              mediaType: 'Movie',
              label: movie.title
            })}
            className="p-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded-lg transition"
            title="Upload Subtitle"
          >
            <Languages className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleOpenEdit(movie)}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition"
            title="Edit Movie"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(movie._id)}
            className="p-1.5 bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-secondary rounded-lg transition"
            title="Delete Movie"
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
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Manage Movies</h1>
              <p className="text-slate-400 text-xs mt-1">Manual entry editing and content maintenance panel</p>
            </div>
            
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-brand-primary hover:bg-opacity-90 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 flex-shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Movie
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
            data={movies}
            loading={loading}
            searchPlaceholder="Search movies by title or director..."
          />

        </div>
      </main>

      {/* Manual Creation / Edit Drawer Modal */}
      <ModalDrawer
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingMovie ? 'Modify Movie Record' : 'Add New Movie Entry'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-luxury-950/40 border border-white/5 rounded-2xl p-4.5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-brand-primary mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Movie Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Director</label>
                <input
                  type="text"
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Synoptical Description</label>
              <textarea
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary leading-relaxed transition"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Country Code</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Original Language</label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Publish Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition"
                >
                  <option value="Published">Published</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-luxury-950/40 border border-white/5 rounded-2xl p-4.5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-brand-secondary mb-2 flex items-center gap-2">
              <Film className="w-4 h-4" /> Media & Metadata Assets
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Poster Image URL</label>
                <input
                  type="text"
                  value={poster}
                  onChange={(e) => setPoster(e.target.value)}
                  placeholder="https://image.tmdb.org/..."
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Backdrop Banner URL</label>
                <input
                  type="text"
                  value={banner}
                  onChange={(e) => setBanner(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Trailer Video URL (YouTube embed)</label>
              <input
                type="text"
                placeholder="https://www.youtube.com/embed/..."
                value={trailer}
                onChange={(e) => setTrailer(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition"
              />
            </div>
          </div>

          <div className="bg-luxury-950/40 border border-white/5 rounded-2xl p-4.5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-2 flex items-center gap-2">
              <Star className="w-4 h-4" /> Meta Statistics & Flags
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Release Date</label>
                <input
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Runtime (mins)</label>
                <input
                  type="number"
                  value={runtime}
                  onChange={(e) => setRuntime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">TMDB Rating</label>
                <input
                  type="text"
                  value={tmdbRating}
                  onChange={(e) => setTmdbRating(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">IMDb Rating</label>
                <input
                  type="text"
                  value={imdbRating}
                  onChange={(e) => setImdbRating(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-luxury-950 border border-white/10 rounded-xl text-slate-200 text-xs outline-none focus:border-brand-primary transition"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHistorical}
                  onChange={(e) => setIsHistorical(e.target.checked)}
                  className="w-4 h-4 accent-brand-primary rounded bg-luxury-950 border-white/10"
                />
                Mark as Historical Drama
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-brand-primary hover:bg-opacity-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-brand-primary/10"
            >
              {saving ? 'Saving...' : 'Save Movie Details'}
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
        mediaId={uploadTarget?.mediaId}
        mediaType={uploadTarget?.mediaType || 'Movie'}
        targetMeta={uploadTarget || { label: 'Movie' }}
        onUploadSuccess={() => fetchMovies(filterStatus, true)}
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
        onDeleteSuccess={() => fetchMovies(filterStatus, true)}
      />
    </div>
  );
}
