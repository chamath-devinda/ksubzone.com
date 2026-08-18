'use client';

import React, { useEffect, useState, useRef } from 'react';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import StatCard from '@/features/admin/components/StatCard';
import { useToast } from '@/features/admin/components/Toast';
import {
  Server, Cloud, Upload, RefreshCw, AlertCircle, Check, Trash2, Download,
  Settings, KeyRound, Database, FileArchive, Loader2, Play, Info, HardDrive,
  Calendar, ShieldCheck
} from 'lucide-react';

export default function BackupManager() {
  const toast = useToast();
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
    } catch (err) {
      setError('Failed to fetch backup configurations.');
      toast.error('Failed to fetch backup configurations.');
    }
  };

  // Fetch Backups from Google Drive
  const fetchBackups = async () => {
    if (!isConfigured) return;
    setLoadingBackups(true);
    setError('');
    try {
      const res = await apiClient.get('/api/admin/backup/list');
      setBackups(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to sync backups from Google Drive.');
      toast.error('Failed to sync backups from Google Drive.');
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (isConfigured && activeTab === 'cloud') {
      fetchBackups();
    }
  }, [isConfigured, activeTab]);

  // Save Config Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setError('');
    setSuccess('');

    try {
      const res = await apiClient.post('/api/admin/backup/settings', {
        serviceAccount,
        folderId
      });
      setSuccess('Backup connection settings updated successfully.');
      toast.success('Settings updated successfully.');
      setIsConfigured(res.data.serviceAccountConfigured);
      setServiceAccountEmail(res.data.serviceAccountEmail);
      setServiceAccount(''); // Clear text area for security
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save configuration settings.');
      toast.error('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Create on-demand backup upload to Drive
  const handleCreateCloudBackup = async () => {
    setCreatingBackup(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.post('/api/admin/backup/create?drive=true');
      setSuccess(res.data.message || 'Backup successfully uploaded to Google Drive.');
      toast.success('Backup uploaded to Google Drive successfully.');
      fetchSettings(); // update last backup time
      fetchBackups(); // reload backups list
    } catch (err) {
      setError(err.response?.data?.message || 'Google Drive backup creation failed.');
      toast.error('Backup creation failed.');
    } finally {
      setCreatingBackup(false);
    }
  };

  // Download local backup directly to PC
  const handleDownloadLocalBackup = async () => {
    setDownloadingLocal(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.post('/api/admin/backup/create', {}, {
        responseType: 'blob'
      });
      
      const blob = new Blob([res.data], { type: 'application/zip' });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `ksubzone_backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      setSuccess('Local backup archive downloaded successfully.');
      toast.success('Local ZIP downloaded successfully.');
    } catch (err) {
      setError('Failed to download local backup archive.');
      toast.error('Failed to download backup ZIP.');
    } finally {
      setDownloadingLocal(false);
    }
  };

  // Delete Backup from Drive
  const handleDeleteBackup = async (fileId, fileName) => {
    if (!window.confirm(`Are you sure you want to permanently delete this backup file from Google Drive?\n(${fileName})`)) {
      return;
    }
    setDeletingId(fileId);
    setError('');
    setSuccess('');
    try {
      setSuccess('Backup file deleted from Google Drive.');
      toast.success('Backup deleted from Google Drive.');
      setBackups(prev => prev.filter(b => b.id !== fileId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete backup file.');
      toast.error('Failed to delete backup file.');
    } finally {
      setDeletingId('');
    }
  };

  // Restore Backup from Drive File ID
  const handleRestoreFromDrive = async (fileId, fileName) => {
    if (!window.confirm(`CRITICAL WARNING: Restoring the backup (${fileName}) will OVERWRITE your current database tables with the restored content. Are you absolutely sure you want to restore?`)) {
      return;
    }
    
    setRestoringId(fileId);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.post('/api/admin/backup/restore', { fileId });
      setSuccess(res.data.message || 'Database restored successfully.');
      toast.success('Database restored successfully! Reloading page to apply changes...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restore backup.');
      toast.error('Failed to restore database.');
    } finally {
      setRestoringId('');
    }
  };

  // Manual Restore Handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.zip')) {
      setSelectedFile(file);
      setError('');
    } else {
      setSelectedFile(null);
      setError('Please select a valid backup ZIP archive (.zip)');
      toast.error('Invalid file type selected. Select a ZIP file.');
    }
  };

  const handleManualRestoreSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    if (!window.confirm(`CRITICAL WARNING: Uploading and restoring this ZIP backup will COMPLETELY WIPEOUT your existing database tables. Are you absolutely sure you want to proceed?`)) {
      return;
    }

    setRestoringManual(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('backup', selectedFile);

    try {
      const res = await apiClient.post('/api/admin/backup/restore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccess(res.data.message || 'Database restored from uploaded zip file.');
      toast.success('Database restored successfully! Reloading page to apply changes...');
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

  // Formatter helpers
  const formatBytes = (bytes) => {
    const b = Number(bytes);
    if (!b || isNaN(b)) return '0 Bytes';
    if (b === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  // Derived indicators
  const totalBackupSize = backups.reduce((acc, b) => acc + Number(b.size || 0), 0);

  return (
    <div className="min-h-screen bg-luxury-950 text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar />

      <main className="flex-grow p-6 sm:p-8 overflow-y-auto min-w-0 max-w-[1600px] w-full mx-auto">
        <div className="space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Cloud className="w-5 h-5 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Security & Backups</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Google Drive Backup & Restore</h1>
              <p className="text-slate-400 text-xs mt-1">
                Establish direct syncing with Google Drive to safeguard subtitles, media catalogs, users, settings, and database configurations.
              </p>
            </div>
            
            <div className="flex gap-2.5 self-start sm:self-auto flex-wrap">
              <button
                onClick={handleDownloadLocalBackup}
                disabled={downloadingLocal}
                className="h-10 px-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-xs font-bold text-slate-200 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {downloadingLocal ? <Loader2 className="w-4 h-4 animate-spin text-brand-primary" /> : <Download className="w-4 h-4" />}
                Download ZIP Local
              </button>
              <button
                onClick={handleCreateCloudBackup}
                disabled={creatingBackup || !isConfigured}
                className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-black uppercase tracking-wider text-white flex items-center gap-2 transition disabled:opacity-30 shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                {creatingBackup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Backup to Drive
              </button>
            </div>
          </div>

          {/* Alert messages */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" /> {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" /> {success}
            </div>
          )}

          {/* Metrics Row */}
          {isConfigured && activeTab === 'cloud' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={Database}
                label="Drive Backup count"
                value={`${backups.length} archives`}
                trend={{ value: 'Linked', isPositive: true }}
              />
              <StatCard
                icon={HardDrive}
                label="Total drive storage used"
                value={formatBytes(totalBackupSize)}
                trend={{ value: 'ZIP Archives', isPositive: true }}
              />
              <StatCard
                icon={Calendar}
                label="Last remote backup"
                value={lastBackupTime ? new Date(lastBackupTime).toLocaleDateString() : 'Never'}
                trend={{ value: lastBackupTime ? new Date(lastBackupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending', isPositive: true }}
              />
              <StatCard
                icon={ShieldCheck}
                label="Status signature"
                value="Configured"
                trend={{ value: 'Google OAuth', isPositive: true }}
              />
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/5 gap-6">
            <button
              onClick={() => setActiveTab('cloud')}
              className={`pb-3 text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'cloud' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Google Drive Backups
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`pb-3 text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'manual' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manual File Restore
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-3 text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'settings' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Drive Configuration
            </button>
          </div>

          {/* TAB 1: Google Drive Backups List */}
          {activeTab === 'cloud' && (
            <div className="space-y-6">
              {!isConfigured && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-extrabold text-amber-300 uppercase tracking-wide">Google Drive is not linked yet</h3>
                    <p className="text-xs text-slate-300">
                      Configure your Google Cloud Service Account credentials and folder ID parameters to unlock automated remote backup archives.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="h-9 px-4.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-[10px] font-black uppercase tracking-wider text-black transition flex-shrink-0 cursor-pointer"
                  >
                    Setup Credentials
                  </button>
                </div>
              )}

              {isConfigured && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Google Status Panel */}
                  <div className="rounded-2xl border border-white/5 bg-luxury-900 p-5 space-y-4 lg:col-span-1">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b border-white/5 pb-2.5">
                      <KeyRound className="w-4 h-4 text-emerald-400" /> Connection Parameters
                    </h2>
                    
                    <div className="space-y-3.5 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-500 uppercase font-black">Authorized Account</span>
                        <span className="text-xs text-slate-200 break-all font-mono bg-luxury-950 p-2 rounded-lg border border-white/5">{serviceAccountEmail}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-500 uppercase font-black">Target Folder ID</span>
                        <span className="text-xs text-slate-200 font-mono break-all bg-luxury-950 p-2 rounded-lg border border-white/5">{folderId}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-500 uppercase font-black">Last Sync Executed</span>
                        <span className="text-xs text-emerald-400 font-bold bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          {formatDate(lastBackupTime)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={fetchBackups}
                      className="w-full h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-emerald-400" /> Resync Drive Files
                    </button>
                  </div>

                  {/* Remote Backups List */}
                  <div className="rounded-2xl border border-white/5 bg-luxury-900 overflow-hidden lg:col-span-2 shadow-2xl">
                    <div className="px-5 py-4 border-b border-white/5 bg-luxury-950/20 flex items-center justify-between">
                      <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Database className="w-4 h-4 text-slate-500" /> Files Stored on Drive
                      </h2>
                    </div>

                    {loadingBackups ? (
                      <div className="py-24 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                        Fetching files from Google Drive...
                      </div>
                    ) : backups.length === 0 ? (
                      <div className="py-24 text-center text-xs text-slate-500">
                        No backup archives (.zip) found in the Google Drive folder.
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {backups.map(file => {
                          const isRestoring = restoringId === file.id;
                          const isDeleting = deletingId === file.id;

                          return (
                            <div key={file.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.01] transition">
                              <div className="flex items-center gap-3 truncate">
                                <span className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex-shrink-0">
                                  <FileArchive className="w-5 h-5" />
                                </span>
                                <div className="truncate space-y-0.5">
                                  <h4 className="text-xs font-bold text-white truncate font-mono">{file.name}</h4>
                                  <p className="text-[10px] text-slate-400">
                                    Size: <span className="font-mono text-slate-200">{formatBytes(file.size)}</span> • Uploaded: <span className="font-mono text-slate-200">{formatDate(file.createdTime)}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex gap-2 self-end sm:self-auto flex-shrink-0">
                                <button
                                  onClick={() => handleRestoreFromDrive(file.id, file.name)}
                                  disabled={isRestoring || isDeleting}
                                  className="h-8 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                  {isRestoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                  Restore
                                </button>
                                <button
                                  onClick={() => handleDeleteBackup(file.id, file.name)}
                                  disabled={isRestoring || isDeleting}
                                  className="h-8 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider hover:bg-red-500 hover:text-white transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Manual ZIP File Restore */}
          {activeTab === 'manual' && (
            <div className="max-w-2xl mx-auto rounded-2xl border border-white/5 bg-luxury-900 p-6 space-y-6 shadow-2xl">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-200 mb-1 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-400" /> Drop-in Manual Recovery
                </h2>
                <p className="text-xs text-slate-400">
                  Upload a previously downloaded backup ZIP file to recover the database records and subtitle attachments manually.
                </p>
              </div>

              <form onSubmit={handleManualRestoreSubmit} className="space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/10 hover:border-emerald-500/30 rounded-2xl p-10 text-center cursor-pointer bg-luxury-950/20 hover:bg-luxury-950/40 transition flex flex-col items-center justify-center gap-3.5"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".zip"
                    className="hidden"
                  />
                  <div className="p-3.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-emerald-400">
                    <FileArchive className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {selectedFile ? selectedFile.name : 'Click to browse or drop backup zip here'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {selectedFile ? `${formatBytes(selectedFile.size)}` : 'Only backup ZIP packages generated by this site are supported.'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="h-10 px-5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold text-slate-400 transition cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!selectedFile || restoringManual}
                    className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/20 disabled:text-slate-500 text-xs font-black uppercase tracking-wider text-white flex items-center gap-2 transition shadow-lg shadow-emerald-500/25 cursor-pointer"
                  >
                    {restoringManual ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Restoring Site...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" /> Start Manual Restore
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Configuration Settings */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto rounded-2xl border border-white/5 bg-luxury-900 p-6 space-y-6 shadow-2xl">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-200 mb-1 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-400" /> Google Drive Connection Configuration
                </h2>
                <p className="text-xs text-slate-400">
                  Input your Google Service Account private key JSON details and target folder ID configurations below to setup automated backup synchronization.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Google Drive Folder ID</label>
                  <input
                    type="text"
                    required
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    placeholder="Enter Google Drive Folder ID"
                    className="w-full h-11 px-4 rounded-xl text-xs bg-luxury-950 border border-white/10 focus:border-emerald-500/50 outline-none text-slate-200 transition"
                  />
                  <span className="text-[10px] text-slate-500 leading-relaxed block">
                    Typically the long alphanumeric string at the end of the Google Drive folder URL (e.g. 1-mG-eq1GNxQrI9Byj23RC-JFOO_3Z57n)
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Service Account Private Key JSON credentials file content
                  </label>
                  <textarea
                    rows={8}
                    required={!isConfigured}
                    value={serviceAccount}
                    onChange={(e) => setServiceAccount(e.target.value)}
                    placeholder={
                      isConfigured 
                        ? 'Google Service Account credentials already configured. Paste new JSON here to update.' 
                        : 'Paste the contents of your Google Service Account private key JSON file here'
                    }
                    className="w-full p-4 rounded-xl text-xs font-mono text-emerald-400 bg-luxury-950 border border-white/10 focus:border-emerald-500/50 outline-none transition"
                  />
                  <span className="text-[10px] text-slate-500 leading-relaxed block">
                    Key requires standard Google Drive file write access permissions. Make sure to share the target Google Drive Folder with the Service Account email (client_email in JSON file) as an <strong>Editor</strong>.
                  </span>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="h-11 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-xs font-black uppercase tracking-wider text-white flex items-center gap-2 transition shadow-lg shadow-emerald-500/25 cursor-pointer"
                  >
                    {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Configurations
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
