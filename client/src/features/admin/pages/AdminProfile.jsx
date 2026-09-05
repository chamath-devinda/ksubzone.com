'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import { useToast } from '@/features/admin/components/Toast';
import {
  User,
  Mail,
  Lock,
  Camera,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Key,
  ShieldAlert,
  Calendar,
  Clock,
  Trash2,
  Save,
  Link as LinkIcon,
  RefreshCw,
  Zap,
  Check
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
];

export default function AdminProfile() {
  const { admin, updateAdminProfile, uploadAdminAvatar, refreshAdminProfile } = useAuth();
  const toast = useToast();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'avatar' | 'security' | 'permissions'

  // Form states
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [customAvatarInput, setCustomAvatarInput] = useState('');

  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Status states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Sync state from admin user
  useEffect(() => {
    if (admin) {
      setUsername(admin.username || '');
      setDisplayName(admin.displayName || admin.username || '');
      setEmail(admin.email || '');
      setBio(admin.bio || '');
      setAvatarUrl(admin.avatar || '');
    }
  }, [admin]);

  // Handle direct file upload
  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file must be smaller than 5MB.');
      return;
    }

    setUploadingFile(true);
    try {
      const res = await uploadAdminAvatar(file);
      if (res.avatarUrl) {
        setAvatarUrl(res.avatarUrl);
        toast.success('Profile photo uploaded and updated successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload profile photo.');
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle profile info update
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !email.trim()) {
      toast.error('Username and Email are required.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateAdminProfile({
        username: username.trim(),
        displayName: displayName.trim(),
        email: email.trim(),
        bio: bio.trim(),
        avatar: avatarUrl
      });
      toast.success('Admin profile details saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle password update
  const handleUpdatePassword = async (e) => {
    if (e) e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await updateAdminProfile({
        currentPassword,
        newPassword
      });
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Remove avatar
  const handleRemoveAvatar = async () => {
    if (!window.confirm('Remove your profile picture and reset to default initials?')) return;
    try {
      await updateAdminProfile({ avatar: '' });
      setAvatarUrl('');
      toast.success('Profile picture removed.');
    } catch (err) {
      toast.error('Failed to remove profile picture.');
    }
  };

  // Apply custom URL or preset
  const handleApplyAvatarUrl = async (url) => {
    if (!url) return;
    setUploadingFile(true);
    try {
      await updateAdminProfile({ avatar: url });
      setAvatarUrl(url);
      setCustomAvatarInput('');
      toast.success('Profile photo updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update avatar photo.');
    } finally {
      setUploadingFile(false);
    }
  };

  const adminName = displayName || username || 'Super Admin';
  const adminInitial = adminName.charAt(0).toUpperCase();
  const adminRole = admin?.role?.name || (typeof admin?.role === 'object' ? admin.role.name : String(admin?.role || 'Super Administrator'));

  return (
    <div className="admin-shell flex min-h-screen bg-[#07080D] text-slate-100 font-sans">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0">
        <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />

        <main className="admin-main p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6 sm:space-y-8">

          {/* ── Top Hero Profile Banner ── */}
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#131522] to-[#0A0C14] shadow-2xl">
            {/* Ambient Background Gradient Art */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
              <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-violet-600/30 blur-[100px]" />
              <div className="absolute top-10 right-0 h-64 w-80 rounded-full bg-fuchsia-600/20 blur-[110px]" />
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]" />
            </div>

            {/* Banner Cover Line */}
            <div className="h-32 sm:h-44 w-full bg-gradient-to-r from-violet-900/40 via-purple-900/30 to-indigo-950/50 border-b border-white/[0.06] relative">
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[11px] font-bold text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Session
                </span>
              </div>
            </div>

            {/* Profile Info Row */}
            <div className="relative px-6 pb-6 pt-0 sm:px-8 sm:pb-8 flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 sm:-mt-20">
              {/* Avatar Circle with Upload Overlay */}
              <div className="relative group">
                <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-3xl p-1 bg-gradient-to-br from-violet-500 via-indigo-600 to-purple-800 shadow-[0_10px_35px_rgba(124,58,237,0.35)]">
                  <div className="h-full w-full rounded-[22px] overflow-hidden bg-[#0A0C14] flex items-center justify-center relative border border-black/40">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={adminName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl sm:text-5xl font-black text-violet-300 select-none">
                        {adminInitial}
                      </span>
                    )}

                    {/* Hover Camera Overlay */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white cursor-pointer"
                      title="Upload new profile picture"
                    >
                      {uploadingFile ? (
                        <RefreshCw className="h-6 w-6 animate-spin text-violet-300" />
                      ) : (
                        <>
                          <Camera className="h-6 w-6 text-violet-300" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Status Dot */}
                <span className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-[#0A0C14] bg-emerald-400 shadow-md" />
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />

              {/* Text Info */}
              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {adminName}
                  </h1>
                  <span className="px-3 py-0.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-[10px] font-black uppercase tracking-wider text-violet-300">
                    {adminRole}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-400">
                  {email} <span className="mx-1.5 text-slate-600">•</span> @{username}
                </p>

                {bio && (
                  <p className="text-xs text-slate-300/80 max-w-xl line-clamp-2 pt-1 font-normal">
                    {bio}
                  </p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2.5 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-600/25 transition active:scale-95 disabled:opacity-50"
                >
                  {uploadingFile ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span>Upload Photo</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition"
                    title="Remove custom avatar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Navigation Tabs ── */}
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1 overflow-x-auto">
            {[
              { id: 'general', label: 'Personal Information', icon: User },
              { id: 'avatar', label: 'Photo & Presets', icon: Camera },
              { id: 'security', label: 'Password & Security', icon: Key },
              { id: 'permissions', label: 'Permissions & System', icon: ShieldCheck },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === id
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* ── TAB 1: General Profile Info ── */}
          {activeTab === 'general' && (
            <div className="grid lg:grid-cols-3 gap-6 animate-fadeInAdmin">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl border border-white/[0.08] bg-[#0E1017]/80 p-6 sm:p-7 backdrop-blur-xl shadow-xl space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <User className="h-4 w-4 text-violet-400" />
                      Account Identity
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Update your administrator credentials, email address, and visible name.
                    </p>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-400">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Chamath Devinda"
                          className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-violet-500/50 focus:bg-white/[0.05]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-400">
                          Username
                        </label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. superadmin"
                          required
                          className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-violet-500/50 focus:bg-white/[0.05]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-400">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@ksubzone.com"
                        required
                        className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-violet-500/50 focus:bg-white/[0.05]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-400">
                        Administrator Bio & Notes
                      </label>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Add a short bio or notes about your administrative role..."
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-violet-500/50 focus:bg-white/[0.05] resize-none"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-600/25 transition active:scale-95 disabled:opacity-50"
                      >
                        {savingProfile ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Side Summary */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/[0.08] bg-[#0E1017]/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    Account Status
                  </h3>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] text-xs">
                      <span className="text-slate-400">Role Status</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {adminRole}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] text-xs">
                      <span className="text-slate-400">Two-Factor Auth</span>
                      <span className="font-semibold text-slate-300">
                        {admin?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] text-xs">
                      <span className="text-slate-400">Last Login</span>
                      <span className="font-semibold text-slate-300">
                        {admin?.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Active Now'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 text-xs">
                      <span className="text-slate-400">Account Type</span>
                      <span className="font-mono text-violet-400 font-bold">System SuperAdmin</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: Photo & Presets ── */}
          {activeTab === 'avatar' && (
            <div className="grid lg:grid-cols-3 gap-6 animate-fadeInAdmin">
              <div className="lg:col-span-2 space-y-6">
                {/* Upload or Drop File */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#0E1017]/80 p-6 sm:p-7 backdrop-blur-xl shadow-xl space-y-5">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Camera className="h-4 w-4 text-violet-400" />
                      Upload Avatar Image
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Upload an image file from your computer (PNG, JPG, WEBP, or GIF up to 5MB).
                    </p>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group border-2 border-dashed border-white/[0.1] hover:border-violet-500/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition-all"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 group-hover:scale-110 transition-transform">
                      {uploadingFile ? (
                        <RefreshCw className="h-6 w-6 animate-spin" />
                      ) : (
                        <Upload className="h-6 w-6" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                        Click to browse or drag & drop image here
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Supported: PNG, JPEG, WEBP, GIF (Max 5MB)
                      </p>
                    </div>
                  </div>

                  {/* Or Custom URL */}
                  <div className="pt-2 border-t border-white/[0.06] space-y-3">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <LinkIcon className="h-3.5 w-3.5 text-violet-400" />
                      Or use an external Image URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={customAvatarInput}
                        onChange={(e) => setCustomAvatarInput(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="h-10 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-violet-500/50 focus:bg-white/[0.05]"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyAvatarUrl(customAvatarInput.trim())}
                        disabled={!customAvatarInput.trim() || uploadingFile}
                        className="px-4 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition disabled:opacity-40"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preset Avatars Selection */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#0E1017]/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-pink-400" />
                      Curated Preset Avatars
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Choose from our collection of high-resolution designer avatars with a single click.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3.5 pt-2">
                    {PRESET_AVATARS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyAvatarUrl(preset)}
                        className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all p-0.5 ${
                          avatarUrl === preset
                            ? 'border-violet-400 ring-2 ring-violet-500/40 scale-105'
                            : 'border-white/[0.08] hover:border-violet-400/50 hover:scale-105'
                        }`}
                      >
                        <img
                          src={preset}
                          alt={`Preset ${idx + 1}`}
                          className="h-full w-full object-cover rounded-xl"
                        />
                        {avatarUrl === preset && (
                          <span className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-bold shadow-md">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Avatar Live Preview Card */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/[0.08] bg-[#0E1017]/80 p-6 backdrop-blur-xl shadow-xl space-y-4 text-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Live Avatar Preview
                  </h3>

                  <div className="mx-auto h-32 w-32 rounded-3xl p-1 bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                    <div className="h-full w-full rounded-[22px] overflow-hidden bg-[#0A0C14] flex items-center justify-center">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-4xl font-black text-violet-300">{adminInitial}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-white">{adminName}</p>
                    <p className="text-xs text-violet-400 font-semibold mt-0.5">{adminRole}</p>
                  </div>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: Password & Security ── */}
          {activeTab === 'security' && (
            <div className="grid lg:grid-cols-3 gap-6 animate-fadeInAdmin">
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-white/[0.08] bg-[#0E1017]/80 p-6 sm:p-7 backdrop-blur-xl shadow-xl space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Key className="h-4 w-4 text-violet-400" />
                      Change Password
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Ensure your account is protected with a strong, complex password.
                    </p>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    {/* Current Password */}
                    <div className="space-y-1.5">
                      <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-400">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPass ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your current password"
                          required
                          className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-3.5 pr-10 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-violet-500/50 focus:bg-white/[0.05]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-400">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter a new password (min. 6 characters)"
                          required
                          className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-3.5 pr-10 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-violet-500/50 focus:bg-white/[0.05]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-1.5">
                      <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate-400">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                        className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-violet-500/50 focus:bg-white/[0.05]"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingPassword}
                        className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-600/25 transition active:scale-95 disabled:opacity-50"
                      >
                        {savingPassword ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                        <span>Update Password</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Security Tips */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/[0.08] bg-[#0E1017]/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                    Security Recommendations
                  </h3>

                  <ul className="space-y-2.5 text-xs text-slate-400">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>Use at least 10 characters with numbers and special symbols.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>Do not reuse passwords across multiple websites.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>Log out when accessing from shared or public computers.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: Permissions & System ── */}
          {activeTab === 'permissions' && (
            <div className="space-y-6 animate-fadeInAdmin">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0E1017]/80 p-6 sm:p-7 backdrop-blur-xl shadow-xl space-y-6">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Administrative Privileges & Permissions
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Authorized features granted to your current role (<strong className="text-violet-300">{adminRole}</strong>).
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { title: 'Dramas & TV Series', desc: 'Create, edit, and organize series & episodes', allowed: true },
                    { title: 'Movies Library', desc: 'Upload, edit, and publish movie titles', allowed: true },
                    { title: 'TMDB Auto Importer', desc: 'Sync metadata directly from TMDB API', allowed: true },
                    { title: 'Subtitle Studio', desc: 'Approve, sync, and moderate community subtitles', allowed: true },
                    { title: 'Articles & News', desc: 'Publish SEO articles, news, and guides', allowed: true },
                    { title: 'Database & Viewer', desc: 'Inspect database tables and execute queries', allowed: true },
                    { title: 'Cloud Backups', desc: 'Create and restore Google Drive / local backups', allowed: true },
                    { title: 'SEO & Site Config', desc: 'Update sitemaps, robots.txt, and branding', allowed: true },
                    { title: 'Member Moderation', desc: 'Suspend or grant access to community members', allowed: true },
                  ].map((perm, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 hover:border-violet-500/30 transition-colors"
                    >
                      <div className="h-6 w-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{perm.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{perm.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
