'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import apiClient from '@/services/api/apiClient';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import DataTable from '@/features/admin/components/DataTable';
import { useToast } from '@/features/admin/components/Toast';
import {
  Users, ShieldAlert, UserCheck, UserX, Search, Filter
} from 'lucide-react';

export default function UserManager() {
  const { admin } = useAuth();
  const toast = useToast();
  
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
    // 1. Role Filter
    if (filterRole === 'Admins' && !u.hasDashboardAccess) return false;
    if (filterRole === 'Users' && u.hasDashboardAccess) return false;

    // 2. Status Filter
    const status = u.status || 'active';
    if (filterStatus === 'Active' && status !== 'active') return false;
    if (filterStatus === 'Suspended' && status !== 'suspended') return false;

    // 3. Search Query (username / email)
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
      label: 'Member / ID',
      sortable: true,
      render: (val, u) => {
        const initial = u.username ? u.username.charAt(0).toUpperCase() : '?';
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-black text-sm flex-shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-slate-200 block text-sm truncate">{u.username}</span>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block truncate">ID: {u._id}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'email',
      label: 'Email Address',
      sortable: true,
      render: (val) => <span className="font-mono text-slate-400 break-all">{val}</span>
    },
    {
      key: 'hasDashboardAccess',
      label: 'Role',
      sortable: true,
      render: (val) => (
        <span className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
          val 
            ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary' 
            : 'bg-white/5 border-white/5 text-slate-400'
        }`}>
          {val ? 'Admin' : 'User'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => {
        const status = val || 'active';
        return (
          <span className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
            status === 'active' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {status}
          </span>
        );
      }
    },
    {
      key: 'createdAt',
      label: 'Joined Date',
      sortable: true,
      render: (val) => <span className="font-mono text-slate-400">{val ? new Date(val).toLocaleDateString() : 'N/A'}</span>
    },
    {
      key: 'actions',
      label: 'Moderator Controls',
      headerAlign: 'text-right',
      render: (_, u) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleToggleDashboardAccess(u._id, u.hasDashboardAccess)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              u.hasDashboardAccess 
                ? 'bg-brand-primary/20 border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/30' 
                : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
            }`}
          >
            {u.hasDashboardAccess ? 'Revoke Admin' : 'Make Admin'}
          </button>
          <button
            onClick={() => handleToggleStatus(u._id, u.status || 'active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              u.status === 'suspended' 
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30' 
                : 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
            }`}
          >
            {u.status === 'suspended' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
            {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-luxury-950 text-slate-100 flex flex-col lg:flex-row">
      <AdminSidebar />

      {/* Primary Details Panel */}
      <main className="flex-grow p-6 sm:p-8 overflow-y-auto min-w-0">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-brand-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-primary">Member Control</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">User Account Registry</h1>
              <p className="text-slate-400 text-xs mt-1">Review active member accounts, verify authentication statuses, and toggle suspends</p>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Search & Custom Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-luxury-900 border border-white/5 p-4 rounded-2xl">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-luxury-950 border border-white/10 rounded-xl focus:border-brand-primary outline-none text-slate-200 text-xs transition"
              />
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full h-10 px-3.5 bg-luxury-950 border border-white/10 rounded-xl outline-none focus:border-brand-primary text-slate-300 text-xs appearance-none cursor-pointer"
              >
                <option value="All">All Roles</option>
                <option value="Admins">Admins Only</option>
                <option value="Users">Regular Users</option>
              </select>
              <div className="absolute right-3.5 top-3 pointer-events-none text-slate-500">
                <Filter className="w-4 h-4" />
              </div>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-10 px-3.5 bg-luxury-950 border border-white/10 rounded-xl outline-none focus:border-brand-primary text-slate-300 text-xs appearance-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Suspended">Suspended Only</option>
              </select>
              <div className="absolute right-3.5 top-3 pointer-events-none text-slate-500">
                <Filter className="w-4 h-4" />
              </div>
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

        </div>
      </main>
    </div>
  );
}
