import React, { useState, useEffect, useRef } from 'react';
import apiClient from '@/services/api/apiClient';
import {
  Server,
  Cloud,
  HardDrive,
  Upload,
  Download,
  RefreshCw,
  Trash2,
  Play,
  Settings,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  KeyRound,
  FileArchive,
  AlertTriangle,
} from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';

interface BackupItem {
  id: string;
  name: string;
  size?: number | string;
  createdTime?: string;
  modifiedTime?: string;
  mimeType?: string;
}

export function BackupRecoveryManager() {
  const [activeTab, setActiveTab] = useState<'cloud' | 'settings'>('cloud');

  // Cloud Settings
  const [folderId, setFolderId] = useState<string>('1-mG-eq1GNxQrI9Byj23RC-JFOO_3Z57n');
  const [serviceAccountJson, setServiceAccountJson] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string>('');
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  // Backups list
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loadingBackups, setLoadingBackups] = useState<boolean>(false);

  // Action states
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [creatingBackup, setCreatingBackup] = useState<boolean>(false);
  const [downloadingLocal, setDownloadingLocal] = useState<boolean>(false);

  // Restore & Delete confirmation
  const [backupToRestore, setBackupToRestore] = useState<BackupItem | null>(null);
  const [backupToDelete, setBackupToDelete] = useState<BackupItem | null>(null);
  const [restoreInProgress, setRestoreInProgress] = useState<boolean>(false);
  const [deleteInProgress, setDeleteInProgress] = useState<boolean>(false);

  // Alerts
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/api/admin/backup/settings');
      setFolderId(res.data.folderId || '1-mG-eq1GNxQrI9Byj23RC-JFOO_3Z57n');
      setIsConfigured(Boolean(res.data.serviceAccountConfigured));
      setServiceAccountEmail(res.data.serviceAccountEmail || '');
      setLastBackupTime(res.data.lastBackupTime || null);
      return Boolean(res.data.serviceAccountConfigured);
    } catch (err) {
      setError('Failed to fetch backup configurations.');
      return false;
    }
  };

  const fetchBackups = async () => {
    setLoadingBackups(true);
    setError('');
    try {
      const res = await apiClient.get('/api/admin/backup/list');
      const list = Array.isArray(res.data) ? res.data : res.data?.backups;
      setBackups(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to list backups from Google Drive.');
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const configured = await fetchSettings();
      if (configured) {
        await fetchBackups();
      }
    };
    init();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setError('');
    setSuccess('');

    try {
      let parsed = null;
      if (serviceAccountJson.trim()) {
        try {
          parsed = JSON.parse(serviceAccountJson);
        } catch (_) {
          setError('Invalid Google Service Account JSON formatting.');
          setSavingSettings(false);
          return;
        }
      }

      const res = await apiClient.post('/api/admin/backup/settings', {
        folderId,
        serviceAccountJson: parsed,
      });

      setSuccess('Google Drive settings updated successfully.');
      setIsConfigured(res.data.serviceAccountConfigured);
      setServiceAccountEmail(res.data.serviceAccountEmail);
      setServiceAccountJson('');
      if (res.data.serviceAccountConfigured) {
        fetchBackups();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateCloudBackup = async () => {
    setCreatingBackup(true);
    setError('');
    setSuccess('');

    try {
      const res = await apiClient.post('/api/admin/backup/create?drive=true');
      setSuccess(`Backup archive (${res.data.filename}) successfully uploaded to Google Drive.`);
      setLastBackupTime(new Date().toISOString());
      fetchBackups();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Backup generation failed.');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadLocalBackup = async () => {
    setDownloadingLocal(true);
    setError('');
    try {
      const res = await apiClient.post('/api/admin/backup/create', null, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ksubzone_backup_${new Date().toISOString().slice(0, 10)}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      setSuccess('Local backup archive generated and downloaded successfully.');
    } catch (err) {
      setError('Failed to download local backup archive.');
    } finally {
      setDownloadingLocal(false);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!backupToRestore) return;
    setRestoreInProgress(true);
    setError('');
    setSuccess('');

    try {
      const res = await apiClient.post('/api/admin/backup/restore', {
        fileId: backupToRestore.id,
      });
      setSuccess(res.data.message || 'System restored successfully from Google Drive backup!');
      setBackupToRestore(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'System restore operation failed.');
    } finally {
      setRestoreInProgress(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!backupToDelete) return;
    setDeleteInProgress(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.delete(`/api/admin/backup/delete/${encodeURIComponent(backupToDelete.id)}`);
      setSuccess(`Backup archive "${backupToDelete.name}" deleted.`);
      setBackupToDelete(null);
      fetchBackups();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete backup from Google Drive.');
    } finally {
      setDeleteInProgress(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Server className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Backup & Disaster Recovery</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#9E57F6]/15 text-[#9E57F6] border border-[#9E57F6]/30">
              FAILSAFE
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Create full system snapshots to Google Drive or local ZIP archives with one-click disaster recovery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'cloud'
                ? 'bg-[#9E57F6] text-white shadow-sm'
                : 'bg-[#141418] text-slate-400 hover:text-white border border-white/[0.08]'
            }`}
          >
            Cloud Backups
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'settings'
                ? 'bg-[#9E57F6] text-white shadow-sm'
                : 'bg-[#141418] text-slate-400 hover:text-white border border-white/[0.08]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Drive Config</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Google Drive Link"
          value={isConfigured ? 'CONNECTED' : 'DISCONNECTED'}
          trend={{ direction: isConfigured ? 'up' : 'down', label: serviceAccountEmail || 'No service account' }}
          icon={Cloud}
          accentColor={isConfigured ? 'emerald' : 'amber'}
        />
        <StatCard
          label="Available Cloud Backups"
          value={backups.length}
          trend={{ direction: 'neutral', label: 'Stored in Drive folder' }}
          icon={FileArchive}
          accentColor="sky"
        />
        <StatCard
          label="Last Backup Created"
          value={lastBackupTime ? new Date(lastBackupTime).toLocaleDateString() : 'Never'}
          trend={{ direction: 'neutral', label: 'Automated snapshot' }}
          icon={Calendar}
          accentColor="violet"
        />
        <StatCard
          label="Security Verification"
          value="ENCRYPTED"
          trend={{ direction: 'up', label: 'Server-side credentials' }}
          icon={ShieldCheck}
          accentColor="pink"
        />
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* Actions Toolbar */}
      {activeTab === 'cloud' && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#141418] border border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={creatingBackup || !isConfigured}
              onClick={handleCreateCloudBackup}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#9E57F6] text-white hover:bg-[#8B3CE8] disabled:opacity-50 transition shadow-lg shadow-[#9E57F6]/20"
            >
              {creatingBackup ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading to Drive...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Create Cloud Backup Now</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={downloadingLocal}
              onClick={handleDownloadLocalBackup}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0C0C0E] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.04] disabled:opacity-50 transition"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>{downloadingLocal ? 'Exporting ZIP...' : 'Download Local ZIP'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchBackups}
            disabled={loadingBackups}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingBackups ? 'animate-spin text-violet-400' : ''}`} />
            <span>Sync Backups</span>
          </button>
        </div>
      )}

      {/* Cloud Backups Tab Table */}
      {activeTab === 'cloud' && (
        <div className="bg-[#141418] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#0C0C0E]/80 border-b border-white/[0.06] text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-5 py-3">Archive File Name</th>
                  <th className="px-5 py-3">Created Date</th>
                  <th className="px-5 py-3">Drive File ID</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {loadingBackups ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#9E57F6]" />
                      <span>Reading Google Drive storage directory...</span>
                    </td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      {isConfigured
                        ? 'No backups found in Google Drive folder yet. Click "Create Cloud Backup Now" above.'
                        : 'Google Drive integration is not yet configured. Switch to "Drive Config" tab above.'}
                    </td>
                  </tr>
                ) : (
                  backups.map(b => (
                    <tr key={b.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-5 py-3.5 font-medium text-slate-200 flex items-center gap-2.5">
                        <FileArchive className="w-4 h-4 text-sky-400 flex-shrink-0" />
                        <span className="truncate max-w-sm">{b.name}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                        {b.createdTime ? new Date(b.createdTime).toLocaleString() : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                        {b.id}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setBackupToRestore(b)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Restore</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBackupToDelete(b)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/[0.04] transition"
                            title="Delete Backup"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-[#141418] border border-white/[0.06] rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/[0.06] pb-4">
            <h2 className="text-sm font-bold text-slate-200">Google Drive Service Account Credentials</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Backups are stored automatically in your private Google Drive using server-side service credentials.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Google Drive Destination Folder ID
              </label>
              <input
                type="text"
                value={folderId}
                onChange={e => setFolderId(e.target.value)}
                placeholder="1-mG-eq1GNxQrI9Byj23RC-JFOO_3Z57n"
                className="w-full px-3.5 py-2 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#9E57F6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Google Service Account JSON Key (Paste file content)
              </label>
              <textarea
                rows={6}
                value={serviceAccountJson}
                onChange={e => setServiceAccountJson(e.target.value)}
                placeholder={
                  isConfigured
                    ? `[Configured as: ${serviceAccountEmail}] - Paste new JSON only if updating credentials.`
                    : '{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "...",\n  "client_email": "..."\n}'
                }
                className="w-full p-3.5 rounded-xl bg-[#0C0C0E] border border-white/[0.08] text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#9E57F6] resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#9E57F6] text-white hover:bg-[#8B3CE8] disabled:opacity-50 transition shadow-lg shadow-[#9E57F6]/20"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{savingSettings ? 'Saving Configuration...' : 'Save Drive Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Restore Confirmation Dialog */}
      {backupToRestore && (
        <ConfirmDialog
          isOpen={Boolean(backupToRestore)}
          onClose={() => setBackupToRestore(null)}
          onConfirm={handleRestoreConfirm}
          title="Restore Database from Backup"
          message={`CRITICAL WARNING: Restoring "${backupToRestore.name}" will overwrite current database records, settings, and metadata with the snapshot from this backup. All active sessions will reload.`}
          confirmLabel="I understand, Restore System"
          confirmVariant="danger"
          loading={restoreInProgress}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {backupToDelete && (
        <ConfirmDialog
          isOpen={Boolean(backupToDelete)}
          onClose={() => setBackupToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Cloud Backup"
          message={`Are you sure you want to permanently delete "${backupToDelete.name}" from your Google Drive storage?`}
          confirmLabel="Delete Archive"
          confirmVariant="danger"
          loading={deleteInProgress}
        />
      )}
    </div>
  );
}
