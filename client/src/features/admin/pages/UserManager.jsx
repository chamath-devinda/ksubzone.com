'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import AdminTopBar from '@/features/admin/components/AdminTopBar';
import DataTable from '@/features/admin/components/DataTable';
import { useToast } from '@/features/admin/components/Toast';
import {
  Users, ShieldAlert, UserCheck, UserX, Search, Filter, ShieldCheck
} from 'lucide-react';

export default function UserManager() {
  const { admin } = useAuth();
  const toast = useToast();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('All'); // 'All' | 'Admins' | 'Users'
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Active' | 'Suspended'

  const fetchUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await apiClient.get('/api/admin/users');
      setUsers(res.data || []);
    } catch (err) {
      setError('Failed to fetch user accounts logs');
      toast.error('Failed to fetch user accounts logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`Are you sure you want to change user status to ${nextStatus}?`)) return;

    try {
      await apiClient.put(`/api/admin/users/${id}/status`, {
        status: nextStatus
      });
      setUsers(prev => prev.map(u => u._id === id ? { ...u, status: nextStatus } : u));
      toast.success(`User status changed to ${nextStatus} successfully.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleToggleDashboardAccess = async (id, currentAccess) => {
    const nextAccess = !currentAccess;
    if (!window.confirm(`Are you sure you want to ${nextAccess ? 'grant' : 'revoke'} admin dashboard access for this user?`)) return;

    try {
      await apiClient.put(`/api/admin/users/${id}/dashboard-access`, {
        hasDashboardAccess: nextAccess
      });
      setUsers(prev => prev.map(u => u._id === id ? { ...u, hasDashboardAccess: nextAccess } : u));
      toast.success(`Dashboard access ${nextAccess ? 'granted' : 'revoked'} successfully.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle dashboard access');
    }
  };

  // Filter local users before feeding to DataTable
  const filteredUsers = users.filter(u => {
    if (filterRole === 'Admins' && !u.hasDashboardAccess) return false;
    if (filterRole === 'Users' && u.hasDashboardAccess) return false;

    const status = u.status || 'active';
    if (filterStatus === 'Active' && status !== 'active') return false;
    if (filterStatus === 'Suspended' && status !== 'suspended') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesUsername = u.username?.toLowerCase().includes(q);
      const matchesEmail = u.email?.toLowerCase().includes(q);
      if (!matchesUsername && !matchesEmail) return false;
    }

    return true;
  });

  const columns = [
    {
      key: 'username',
      label: 'Member',
      sortable: true,
      render: (val, u) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0 shadow-sm">
            {val ? val[0] : 'U'}
          </div>
          <div className="min-w-0">
            <span className="font-bold text-slate-100 block text-xs truncate">{val}</span>
            <span className="text-[10px] text-slate-500 font-mono block truncate">{u.email}</span>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Permission Role',
      sortable: true,
      render: (_, u) => (
        <div className="flex items-center gap-1.5">
          {u.hasDashboardAccess ? (
            <span className="px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-violet-400" /> Admin
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-[#151821] border border-white/[0.06] text-slate-400 text-[10px] font-medium">
              Member
            </span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Account Status',
      sortable: true,
      render: (val) => {
        const isSuspended = val === 'suspended';
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isSuspended 
              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' 
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          }`}>
            {isSuspended ? 'Suspended' : 'Active'}
          </span>
        );
      }
    },
    {
      key: 'createdAt',
      label: 'Joined Date',
      sortable: true,
      render: (val) => <span className="font-mono text-xs text-slate-400">{val ? new Date(val).toLocaleDateString() : '—'}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      headerAlign: 'text-right',
      render: (_, u) => (
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleToggleDashboardAccess(u._id, u.hasDashboardAccess)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              u.hasDashboardAccess 
                ? 'bg-violet-500/10 border border-violet-500/25 text-violet-300 hover:bg-violet-500/20' 
                : 'bg-[#151821] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            {u.hasDashboardAccess ? 'Revoke Admin' : 'Make Admin'}
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(u._id, u.status || 'active')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              u.status === 'suspended' 
                ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            {u.status === 'suspended' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
            <span>{u.status === 'suspended' ? 'Reactivate' : 'Suspend'}</span>
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
          
          <div className="pb-2 border-b border-white/[0.05]">
            <h1 className="text-2xl font-extrabold text-slate-100 font-display tracking-tight">Members & Permissions</h1>
            <p className="text-xs text-slate-400 mt-0.5">Review active member accounts, verify authentication statuses, and manage access roles</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Search & Custom Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#11131A] border border-white/[0.06] p-3 rounded-xl">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-[#08090D] border border-white/[0.08] rounded-lg focus:border-violet-500 outline-none text-slate-100 text-xs transition"
              />
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full h-9 px-3 bg-[#08090D] border border-white/[0.08] rounded-lg outline-none focus:border-violet-500 text-slate-200 text-xs cursor-pointer"
              >
                <option value="All">All Roles</option>
                <option value="Admins">Admins Only</option>
                <option value="Users">Regular Users</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-9 px-3 bg-[#08090D] border border-white/[0.08] rounded-lg outline-none focus:border-violet-500 text-slate-200 text-xs cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Suspended">Suspended Only</option>
              </select>
            </div>
          </div>

          {/* User Table grid */}
          <DataTable
            columns={columns}
            data={filteredUsers}
            loading={loading}
            emptyTitle="No registered users found"
            emptyDescription="There are no users matching the selected filter criteria."
            pageSize={10}
          />

        </main>
      </div>
    </div>
  );
}
