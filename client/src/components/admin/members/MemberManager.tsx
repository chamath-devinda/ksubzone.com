import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api/apiClient';
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  Search,
  Filter,
  ShieldAlert,
  Mail,
  Calendar,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserCog,
} from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { StatusBadge } from '../ui/StatusBadge';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface UserItem {
  _id: string;
  username: string;
  email: string;
  hasDashboardAccess?: boolean;
  role?: string;
  status?: 'active' | 'suspended';
  createdAt?: string;
  lastLogin?: string;
}

export function MemberManager() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'All' | 'Admins' | 'Members'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Suspended'>('All');

  // Confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<{
    type: 'status' | 'dashboard';
    user: UserItem;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/api/admin/users');
      const list = Array.isArray(res.data) ? res.data : res.data?.users;
      setUsers(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch member accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleExecuteConfirm = async () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      if (type === 'status') {
        const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
        await apiClient.put(`/api/admin/users/${user._id}/status`, { status: nextStatus });
        setUsers(prev => prev.map(u => (u._id === user._id ? { ...u, status: nextStatus } : u)));
        setSuccess(`User "${user.username}" status updated to ${nextStatus}.`);
      } else if (type === 'dashboard') {
        const nextAccess = !user.hasDashboardAccess;
        await apiClient.put(`/api/admin/users/${user._id}/dashboard-access`, {
          hasDashboardAccess: nextAccess,
        });
        setUsers(prev =>
          prev.map(u => (u._id === user._id ? { ...u, hasDashboardAccess: nextAccess } : u))
        );
        setSuccess(
          `Dashboard access ${nextAccess ? 'granted to' : 'revoked from'} "${user.username}".`
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  // Filter calculations
  const filteredUsers = users.filter(u => {
    if (filterRole === 'Admins' && !u.hasDashboardAccess) return false;
    if (filterRole === 'Members' && u.hasDashboardAccess) return false;

    const status = u.status || 'active';
    if (filterStatus === 'Active' && status !== 'active') return false;
    if (filterStatus === 'Suspended' && status !== 'suspended') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.username?.toLowerCase().includes(q);
      const matchMail = u.email?.toLowerCase().includes(q);
      if (!matchName && !matchMail) return false;
    }

    return true;
  });

  const totalMembers = users.length;
  const adminCount = users.filter(u => u.hasDashboardAccess).length;
  const activeCount = users.filter(u => (u.status || 'active') === 'active').length;
  const suspendedCount = users.filter(u => u.status === 'suspended').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Users className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Member Management</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#9E57F6]/15 text-[#9E57F6] border border-[#9E57F6]/30">
              ROLES & RBAC
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Review registered user accounts, manage dashboard permissions, and administer suspension statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#141418] border border-white/[0.1] text-slate-300 hover:bg-white/[0.06] transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-violet-400' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Registered Users"
          value={totalMembers}
          icon={Users}
          accentColor="violet"
        />
        <StatCard
          label="Active Accounts"
          value={activeCount}
          trend={{ direction: 'up', label: `${Math.round((activeCount / (totalMembers || 1)) * 100)}% active` }}
          icon={UserCheck}
          accentColor="emerald"
        />
        <StatCard
          label="Admin Privileges"
          value={adminCount}
          trend={{ direction: 'neutral', label: 'Management access' }}
          icon={ShieldCheck}
          accentColor="pink"
        />
        <StatCard
          label="Suspended Accounts"
          value={suspendedCount}
          trend={{ direction: suspendedCount > 0 ? 'down' : 'neutral', label: 'Access restricted' }}
          icon={ShieldAlert}
          accentColor="amber"
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

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#141418] border border-white/[0.06]">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0C0C0E] border border-white/[0.08] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#9E57F6]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-[#0C0C0E] border border-white/[0.08] p-1 rounded-lg">
            {(['All', 'Admins', 'Members'] as const).map(role => (
              <button
                key={role}
                type="button"
                onClick={() => setFilterRole(role)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  filterRole === role
                    ? 'bg-[#9E57F6] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#0C0C0E] border border-white/[0.08] p-1 rounded-lg">
            {(['All', 'Active', 'Suspended'] as const).map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  filterStatus === status
                    ? 'bg-[#9E57F6] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Member Data Table */}
      <div className="bg-[#141418] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0C0C0E]/80 border-b border-white/[0.06] text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Access Level</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Registered</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#9E57F6]" />
                    <span>Loading members database...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No matching member records found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user._id} className="hover:bg-white/[0.02] transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm flex-shrink-0">
                          {user.username ? user.username[0] : 'U'}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-200 block truncate">
                            {user.username}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono block truncate">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {user.hasDashboardAccess ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#9E57F6]/15 border border-[#9E57F6]/30 text-[#9E57F6] font-bold text-[10px] uppercase tracking-wider">
                          <ShieldCheck className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#0C0C0E] border border-white/[0.06] text-slate-400 font-medium text-[10px]">
                          Member
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <StatusBadge status={user.status || 'active'} />
                    </td>

                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ type: 'dashboard', user })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            user.hasDashboardAccess
                              ? 'bg-[#9E57F6]/10 border border-[#9E57F6]/30 text-[#9E57F6] hover:bg-[#9E57F6]/20'
                              : 'bg-[#0C0C0E] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04]'
                          }`}
                        >
                          {user.hasDashboardAccess ? 'Revoke Admin' : 'Grant Admin'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmAction({ type: 'status', user })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                            user.status === 'suspended'
                              ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:bg-rose-500/20'
                          }`}
                        >
                          {user.status === 'suspended' ? (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>Reactivate</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3" />
                              <span>Suspend</span>
                            </>
                          )}
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

      {/* Action Confirmation Modal */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={Boolean(confirmAction)}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleExecuteConfirm}
          title={
            confirmAction.type === 'status'
              ? `${confirmAction.user.status === 'suspended' ? 'Reactivate' : 'Suspend'} Account`
              : `${confirmAction.user.hasDashboardAccess ? 'Revoke' : 'Grant'} Admin Privileges`
          }
          message={
            confirmAction.type === 'status'
              ? `Are you sure you want to change account status for "${confirmAction.user.username}" to ${
                  confirmAction.user.status === 'suspended' ? 'active' : 'suspended'
                }?`
              : `Are you sure you want to ${
                  confirmAction.user.hasDashboardAccess ? 'revoke admin access from' : 'grant full admin management access to'
                } "${confirmAction.user.username}"?`
          }
          confirmLabel={confirmAction.type === 'status' ? 'Update Status' : 'Confirm Access'}
          confirmVariant={
            confirmAction.type === 'status' && confirmAction.user.status !== 'suspended'
              ? 'danger'
              : 'primary'
          }
          loading={actionLoading}
        />
      )}
    </div>
  );
}
