'use client';

import React, { useEffect, useState, useRef } from 'react';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import StatCard from '@/features/admin/components/StatCard';
import { useToast } from '@/features/admin/components/Toast';
import {
  Server, Cloud, Upload, RefreshCw, AlertCircle, Check, Trash2, Download,
  Settings, KeyRound, Database, FileArchive, Loader2, Play, Info, HardDrive,
  Calendar, ShieldCheck
} from 'lucide-react';

export default function BackupManager() {
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('cloud'); // 'cloud' | 'manual' | 'settings'
  
  // Settings States
  const [folderId, setFolderId] = useState('1-mG-eq1GNxQrI9Byj23RC-JFOO_3Z57n');
  const [serviceAccount, setServiceAccount] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [lastBackupTime, setLastBackupTime] = useState(null);
  
  // Backups List State
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  
  // Actions Loading States
  const [savingSettings, setSavingSettings] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [downloadingLocal, setDownloadingLocal] = useState(false);
  const [restoringId, setRestoringId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  
  // Manual Restore State
  const [selectedFile, setSelectedFile] = useState(null);
  const [restoringManual, setRestoringManual] = useState(false);
  const fileInputRef = useRef(null);

  // Global Alerts
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/api/admin/backup/settings');
      setFolderId(res.data.folderId || '1-mG-eq1GNxQrI9Byj23RC-JFOO_3Z57n');
      setIsConfigured(res.data.serviceAccountConfigured || false);
      setServiceAccountEmail(res.data.serviceAccountEmail || '');
      setLastBackupTime(res.data.lastBackupTime || null);
      return Boolean(res.data.serviceAccountConfigured);
    } catch (err) {
      setError('Failed to fetch backup configurations.');
      toast.error('Failed to fetch backup configurations.');
      return false;
    }
  };

  // Fetch Backups from Google Drive
  const fetchBackups = async () => {
    setLoadingBackups(true);
    setError('');
    try {
      const res = await apiClient.get('/api/admin/backup/list');
      const list = Array.isArray(res.data) ? res.data : res.data?.backups;
      setBackups(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to list backups from Google Drive.');
      toast.error('Failed to list backups from Google Drive.');
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const configured = await fetchSettings();
      if (!active) return;
      if (configured) {
        await fetchBackups();
      } else {
        setBackups([]);
        setLoadingBackups(false);
      }
    };
    initialize();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save Service Account & Folder ID Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setError('');
    setSuccess('');

    try {
      let parsedCreds = null;
      if (serviceAccount.trim()) {
        try {
          parsedCreds = JSON.parse(serviceAccount);
        } catch (jsonErr) {
          setError('Invalid Google Service Account JSON formatting. Please check syntax.');
          toast.error('Invalid Google Service Account JSON.');
          setSavingSettings(false);
          return;
        }
      }

      const res = await apiClient.post('/api/admin/backup/settings', {
        folderId,
        serviceAccountJson: parsedCreds
      });

      setSuccess('Google Drive settings updated successfully.');
      toast.success('Google Drive settings updated.');
      setIsConfigured(res.data.serviceAccountConfigured);
      setServiceAccountEmail(res.data.serviceAccountEmail);
      setServiceAccount(''); // Clear sensitive text
      if (res.data.serviceAccountConfigured) {
        fetchBackups();
      } else {
        setBackups([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings.');
      toast.error('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Trigger Instant Cloud Backup to Drive
  const handleCreateCloudBackup = async () => {
    setCreatingBackup(true);
    setError('');
    setSuccess('');

    try {
      const res = await apiClient.post('/api/admin/backup/create?drive=true');
      setSuccess(`Backup archive (${res.data.filename}) successfully uploaded to Google Drive.`);
      toast.success('Backup uploaded to Google Drive.');
      setLastBackupTime(new Date().toISOString());
      fetchBackups();
    } catch (err) {
      setError(err.response?.data?.message || 'Backup generation failed.');
      toast.error('Backup generation failed.');
    } finally {
      setCreatingBackup(false);
    }
  };

  // Direct Local ZIP Download
  const handleDownloadLocalBackup = async () => {
    setDownloadingLocal(true);
    setError('');
    try {
      const res = await apiClient.post('/api/admin/backup/create', null, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ksubzone_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Downloaded complete local database & media ZIP archive.');
    } catch (err) {
      setError('Failed to download local backup archive.');
      toast.error('Failed to download local backup.');
    } finally {
      setDownloadingLocal(false);
    }
  };

  // Restore Cloud Backup
  const handleRestoreCloud = async (fileId, fileName) => {
    const confirmation = window.prompt(
      `WARNING: Restoring "${fileName}" will OVERWRITE all current database records and site settings.\n\nType "RESTORE" to proceed:`
    );
    if (confirmation !== 'RESTORE') {
      toast.info('Restore cancelled.');
      return;
    }

    setRestoringId(fileId);
    setError('');
    setSuccess('');

    try {
      const res = await apiClient.post('/api/admin/backup/restore', { fileId });
      setSuccess(res.data.message || 'System restored successfully. Reloading platform...');
      toast.success('System restored successfully.');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restore backup.');
      toast.error('Failed to restore backup.');
    } finally {
      setRestoringId('');
    }
  };

  // Delete Backup from Google Drive
  const handleDeleteCloud = async (fileId, fileName) => {
    if (!window.confirm(`Permanently delete backup "${fileName}" from Google Drive?`)) return;

    setDeletingId(fileId);
    setError('');
    setSuccess('');

    try {
      await apiClient.delete(`/api/admin/backup/delete/${encodeURIComponent(fileId)}`);
      toast.success('Backup deleted from Google Drive.');
      setBackups(prev => prev.filter(b => b.id !== fileId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete backup.');
      toast.error('Failed to delete backup.');
    } finally {
      setDeletingId('');
    }
  };

  // Handle Manual ZIP File Restore Upload
  const handleManualRestoreSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please choose a .zip backup archive to upload.');
      return;
    }

    const confirmation = window.prompt(
      `WARNING: Restoring "${selectedFile.name}" will overwrite existing database records and media files.\n\nType "RESTORE" to proceed:`
    );
    if (confirmation !== 'RESTORE') {
      toast.info('Restore cancelled.');
      return;
    }

    setRestoringManual(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('backup', selectedFile);

    try {
      const res = await apiClient.post('/api/admin/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(res.data.message || 'Manual backup restored successfully. Reloading...');
      toast.success('System restored from uploaded archive.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Restoration failed. Please check the integrity of the ZIP file.');
      toast.error('Restoration failed.');
    } finally {
      setRestoringManual(false);
    }
  };

  const formatBytes = (bytes) => {
    const b = Number(bytes);
    if (!b || isNaN(b)) return '0 Bytes';
    if (b === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalBackupSize = backups.reduce((acc, b) => acc + Number(b.size || 0), 0);

  return (
    <div className="admin-shell min-h-screen bg-[#08090D] text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobileNav={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopBar onOpenMobileNav={() => setMobileOpen(true)} />

        <main className="admin-main flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1560px] w-full mx-auto space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.05] pb-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100 font-display tracking-tight">Google Drive Backup & Restore</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Establish direct syncing with Google Drive to safeguard subtitles, media catalogs, users, settings, and database configurations.
              </p>
            </div>
            
            <div className="flex gap-2 self-start sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={handleDownloadLocalBackup}
                disabled={downloadingLocal}
                className="h-9 px-3.5 rounded-lg border border-white/[0.08] bg-[#11131A] hover:bg-white/[0.04] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {downloadingLocal ? <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" /> : <Download className="w-3.5 h-3.5" />}
                <span>Download ZIP Local</span>
              </button>
              <button
                type="button"
                onClick={handleCreateCloudBackup}
                disabled={creatingBackup || !isConfigured}
                className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 transition disabled:opacity-30 shadow-sm cursor-pointer"
              >
                {creatingBackup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Backup to Drive</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" /> {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" /> {success}
            </div>
          )}

          {isConfigured && activeTab === 'cloud' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <StatCard icon={Database} label="Drive Backup count" value={`${backups.length} archives`} variant="secondary" />
              <StatCard icon={HardDrive} label="Total drive storage used" value={formatBytes(totalBackupSize)} variant="secondary" />
              <StatCard icon={Calendar} label="Last remote backup" value={lastBackupTime ? new Date(lastBackupTime).toLocaleDateString() : 'Never'} variant="secondary" />
              <StatCard icon={ShieldCheck} label="Status signature" value="Configured" variant="secondary" />
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex gap-1 bg-[#11131A] p-1 rounded-xl border border-white/[0.06] w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('cloud')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${activeTab === 'cloud' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Cloud className="w-3.5 h-3.5" /> Google Drive Archives
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${activeTab === 'manual' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Upload className="w-3.5 h-3.5" /> Manual ZIP Restore
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${activeTab === 'settings' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Settings className="w-3.5 h-3.5" /> Google Cloud Credentials
            </button>
          </div>

          {/* TAB 1: Google Drive Backups */}
          {activeTab === 'cloud' && (
            <div className="rounded-xl border border-white/[0.06] bg-[#11131A] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Google Drive Backups</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Automated backups stored in your private Google Drive directory</p>
                </div>
                <button
                  type="button"
                  onClick={fetchBackups}
                  disabled={loadingBackups}
                  className="h-8 px-3 rounded-lg border border-white/[0.08] bg-[#151821] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingBackups ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {loadingBackups ? (
                <div className="py-20 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                  Loading Google Drive archives...
                </div>
              ) : !isConfigured ? (
                <div className="py-14 text-center text-xs text-slate-400 space-y-2">
                  <KeyRound className="w-7 h-7 text-amber-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-200">Google Cloud Credentials Not Configured</p>
                  <p className="text-slate-500 max-w-md mx-auto">Please configure your Google Service Account in the "Google Cloud Credentials" tab.</p>
                </div>
              ) : backups.length === 0 ? (
                <div className="py-14 text-center text-xs text-slate-500">
                  No backup archives found in your Google Drive folder. Click "Backup to Drive" to create one.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {backups.map((b) => (
                    <div key={b.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#151821] border border-white/[0.06] flex items-center justify-center text-slate-400 flex-shrink-0">
                          <FileArchive className="w-4 h-4 text-violet-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{b.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{formatBytes(b.size)} • {new Date(b.createdTime).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          disabled={restoringId === b.id}
                          onClick={() => handleRestoreCloud(b.id, b.name)}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        >
                          {restoringId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === b.id}
                          onClick={() => handleDeleteCloud(b.id, b.name)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-lg text-xs font-semibold transition"
                          title="Delete Backup"
                        >
                          {deletingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Manual ZIP Restore */}
          {activeTab === 'manual' && (
            <div className="rounded-xl border border-white/[0.06] bg-[#11131A] p-5 space-y-4 max-w-2xl">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Manual Archive Upload & Restore</h3>
                <p className="text-xs text-slate-500 mt-0.5">Upload a previously generated .zip backup file to restore database data</p>
              </div>

              <form onSubmit={handleManualRestoreSubmit} className="space-y-4">
                <div
                  className="border border-dashed border-white/[0.12] hover:border-violet-500/50 rounded-xl p-8 flex flex-col items-center justify-center bg-[#08090D] cursor-pointer transition"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-slate-500 mb-2" />
                  {selectedFile ? (
                    <p className="text-xs text-emerald-400 font-semibold">{selectedFile.name} ({formatBytes(selectedFile.size)})</p>
                  ) : (
                    <>
                      <p className="text-xs text-slate-300 font-semibold">Select or drag .zip backup archive here</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Maximum size: 200MB</p>
                    </>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!selectedFile || restoringManual}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-50 transition"
                  >
                    {restoringManual ? 'Restoring System...' : 'Upload & Restore System'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Google Cloud Settings */}
          {activeTab === 'settings' && (
            <div className="rounded-xl border border-white/[0.06] bg-[#11131A] p-5 space-y-4 max-w-3xl">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Google Drive API Configuration</h3>
                <p className="text-xs text-slate-500 mt-0.5">Configure your Google Cloud service account to enable automated Google Drive sync</p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Google Drive Folder ID</label>
                  <input
                    type="text"
                    required
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Google Service Account Key (JSON)
                    {isConfigured && <span className="text-emerald-400 ml-2 font-mono text-[10px]">✓ Configured ({serviceAccountEmail})</span>}
                  </label>
                  <textarea
                    rows={8}
                    value={serviceAccount}
                    onChange={(e) => setServiceAccount(e.target.value)}
                    placeholder={isConfigured ? 'Service account is configured. Paste new JSON here only if updating credentials.' : 'Paste full service-account.json content here...'}
                    className="w-full px-3 py-2 bg-[#08090D] border border-white/[0.08] rounded-lg text-xs text-slate-100 outline-none focus:border-violet-500 font-mono"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-50 transition"
                  >
                    {savingSettings ? 'Saving Settings...' : 'Save Configuration'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
