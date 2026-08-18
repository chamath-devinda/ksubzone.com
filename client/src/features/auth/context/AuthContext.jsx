'use client';

import React, { createContext, useState, useEffect } from 'react';
import apiClient from '@/services/api/apiClient';
import { tokenService } from '@/services/api/tokenService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync session on mount
  useEffect(() => {
    const initAuth = async () => {
      console.log('[AuthContext] initAuth started');
      
      // 1. Populate state from cached storage to avoid screen flickering on refresh
      const cachedUser = tokenService.getUserProfile();
      const cachedAdmin = tokenService.getAdminProfile();
      if (cachedUser) {
        console.log('[AuthContext] Restored user profile from cache:', cachedUser);
        setUser(cachedUser);
      }
      if (cachedAdmin) {
        console.log('[AuthContext] Restored admin profile from cache:', cachedAdmin);
        setAdmin(cachedAdmin);
      }

      const token = tokenService.getUserToken();
      const adminToken = tokenService.getAdminToken();
      console.log('[AuthContext] Read tokens from storage - user token present:', !!token, 'admin token present:', !!adminToken);

      // Run both requests in PARALLEL — no sequential await
      console.log('[AuthContext] Triggering parallel /me fetches...');
      const [userResult, adminResult] = await Promise.allSettled([
        token ? apiClient.get('/api/auth/me') : Promise.resolve(null),
        adminToken ? apiClient.get('/api/admin/me') : Promise.resolve(null)
      ]);

      console.log('[AuthContext] Parallel fetches completed');
      console.log('[AuthContext] userResult status:', userResult.status, 'value:', userResult.status === 'fulfilled' ? !!userResult.value : userResult.reason);
      console.log('[AuthContext] adminResult status:', adminResult.status, 'value:', adminResult.status === 'fulfilled' ? !!adminResult.value : adminResult.reason);

      if (token) {
        if (userResult.status === 'fulfilled' && userResult.value) {
          console.log('[AuthContext] Restoring user session:', userResult.value.data);
          setUser(userResult.value.data);
        } else {
          const reason = userResult.reason;
          const status = reason?.status || reason?.response?.status;
          // Only invalidate token/session on explicit 401 or 403 authorization failures
          if (status === 401 || status === 403) {
            console.log('[AuthContext] User token invalid (401/403), clearing session');
            tokenService.removeUserToken();
            setUser(null);
          } else {
            console.log('[AuthContext] User verification query failed (offline/network/server error). Retaining cached session.');
          }
        }
      } else {
        setUser(null);
      }

      if (adminToken) {
        if (adminResult.status === 'fulfilled' && adminResult.value) {
          console.log('[AuthContext] Restoring admin session:', adminResult.value.data);
          setAdmin(adminResult.value.data);
        } else {
          const reason = adminResult.reason;
          const status = reason?.status || reason?.response?.status;
          // Only invalidate token/session on explicit 401 or 403 authorization failures
          if (status === 401 || status === 403) {
            console.log('[AuthContext] Admin token invalid (401/403), clearing session');
            tokenService.removeAdminToken();
            setAdmin(null);
          } else {
            console.log('[AuthContext] Admin verification query failed (offline/network/server error). Retaining cached session.');
          }
        }
      } else {
        setAdmin(null);
      }

      console.log('[AuthContext] Setting loading to false');
      setLoading(false);
    };

    initAuth();
  }, []);

  // Synchronize 'user' state to localStorage cache once initial load completes
  useEffect(() => {
    if (loading) return;
    if (user) {
      tokenService.setUserProfile(user);
    } else {
      tokenService.removeUserProfile();
    }
  }, [user, loading]);

  // Synchronize 'admin' state to localStorage cache once initial load completes
  useEffect(() => {
    if (loading) return;
    if (admin) {
      tokenService.setAdminProfile(admin);
    } else {
      tokenService.removeAdminProfile();
    }
  }, [admin, loading]);

  // Listen for global auth expiration events from Axios interceptor
  useEffect(() => {
    const handleUserExpire = () => {
      setUser(null);
    };
    const handleAdminExpire = () => {
      setAdmin(null);
    };
    window.addEventListener('user-session-expired', handleUserExpire);
    window.addEventListener('admin-session-expired', handleAdminExpire);
    return () => {
      window.removeEventListener('user-session-expired', handleUserExpire);
      window.removeEventListener('admin-session-expired', handleAdminExpire);
    };
  }, []);

  const loginUser = async (email, password, code2fa) => {
    // Clear admin session to prevent concurrent mixed roles in single browser
    tokenService.removeAdminToken();
    setAdmin(null);

    const res = await apiClient.post('/api/auth/login', { email, password, code2fa });
    if (res.data.token) {
      tokenService.setUserToken(res.data.token);
      setUser(res.data.user);
    }
    return res.data;
  };

  const loginAdmin = async (email, password, code2fa) => {
    // Clear user session to prevent concurrent mixed roles in single browser
    tokenService.removeUserToken();
    setUser(null);

    const res = await apiClient.post('/api/admin/login', { email, password, code2fa });
    if (res.data.token) {
      tokenService.setAdminToken(res.data.token);
      setAdmin(res.data.admin);
    }
    return res.data;
  };

  const logoutUser = async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (err) {
      console.error('[AuthContext] Logout failed on server:', err);
    }
    tokenService.removeUserToken();
    setUser(null);
  };

  const logoutAdmin = async () => {
    try {
      await apiClient.post('/api/admin/logout');
    } catch (err) {
      console.error('[AuthContext] Admin logout failed on server:', err);
    }
    tokenService.removeAdminToken();
    setAdmin(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await apiClient.get('/api/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error('Refresh profile error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      admin,
      loading,
      loginUser,
      loginAdmin,
      logoutUser,
      logoutAdmin,
      refreshProfile,
      setUser,
      setAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};
