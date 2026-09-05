'use client';

import React, { createContext, useState, useEffect } from 'react';
import apiClient from '@/services/api/apiClient';
import { tokenService } from '@/services/api/tokenService';

export const AuthContext = createContext();

// Shared-hosting ModSecurity can reject otherwise valid passwords when their
// raw text resembles a security-rule signature. TLS still protects the request;
// this transport encoding only keeps the WAF from misclassifying the value.
const encodeAdminCredential = (password) => {
  const bytes = new TextEncoder().encode(password);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync session on mount
  useEffect(() => {
    const initAuth = async () => {
      // 1. Populate state from cached storage to avoid screen flickering on refresh
      const cachedUser = tokenService.getUserProfile();
      const cachedAdmin = tokenService.getAdminProfile();
      if (cachedUser) {
        setUser(cachedUser);
      }
      if (cachedAdmin) {
        setAdmin(cachedAdmin);
      }

      const token = tokenService.getUserToken();
      const adminToken = tokenService.getAdminToken();

      // Run both requests in PARALLEL — no sequential await
      const [userResult, adminResult] = await Promise.allSettled([
        token ? apiClient.get('/api/auth/me') : Promise.resolve(null),
        adminToken ? apiClient.get('/api/admin/me') : Promise.resolve(null)
      ]);

      if (token) {
        if (userResult.status === 'fulfilled' && userResult.value) {
          setUser(userResult.value.data);
        } else {
          const reason = userResult.reason;
          const status = reason?.status || reason?.response?.status;
          // Only invalidate token/session on explicit 401 or 403 authorization failures
          if (status === 401 || status === 403) {
            tokenService.removeUserToken();
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }

      if (adminToken) {
        if (adminResult.status === 'fulfilled' && adminResult.value) {
          setAdmin(adminResult.value.data);
        } else {
          const reason = adminResult.reason;
          const status = reason?.status || reason?.response?.status;
          // Only invalidate token/session on explicit 401 or 403 authorization failures
          if (status === 401 || status === 403) {
            tokenService.removeAdminToken();
            setAdmin(null);
          }
        }
      } else {
        setAdmin(null);
      }

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

    const res = await apiClient.post('/api/admin/login', {
      email,
      credential: encodeAdminCredential(password),
      credentialEncoding: 'base64url',
      code2fa
    });
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

  const updateAdminProfile = async (profileData) => {
    const res = await apiClient.put('/api/admin/profile', profileData);
    if (res.data?.admin) {
      setAdmin(res.data.admin);
      tokenService.setAdminProfile(res.data.admin);
    }
    return res.data;
  };

  const uploadAdminAvatar = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await apiClient.post('/api/admin/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (res.data?.avatarUrl) {
      setAdmin((prev) => {
        const next = { ...(prev || {}), avatar: res.data.avatarUrl };
        tokenService.setAdminProfile(next);
        return next;
      });
    }
    return res.data;
  };

  const refreshAdminProfile = async () => {
    try {
      const res = await apiClient.get('/api/admin/me');
      if (res.data) {
        setAdmin(res.data);
        tokenService.setAdminProfile(res.data);
      }
    } catch (err) {
      console.error('Refresh admin profile error:', err);
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
      updateAdminProfile,
      uploadAdminAvatar,
      refreshAdminProfile,
      setUser,
      setAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};
