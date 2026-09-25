'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const AdminThemeContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  isLight: false,
  mounted: false,
});

export function AdminThemeProvider({ children }) {
  // The Studio design is intentionally dark-only. Do not restore an earlier
  // per-user light preference here: it would introduce non-black surface layers.
  const [theme, setThemeState] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isDark = theme === 'dark';
      document.documentElement.setAttribute('data-admin-theme', theme);
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.classList.toggle('light', !isDark);
      document.documentElement.classList.toggle('admin-theme-dark', isDark);
      document.documentElement.classList.toggle('admin-theme-light', !isDark);

      if (document.body) {
        document.body.setAttribute('data-admin-theme', theme);
        document.body.classList.toggle('dark', isDark);
        document.body.classList.toggle('light', !isDark);
        document.body.classList.toggle('admin-theme-dark', isDark);
        document.body.classList.toggle('admin-theme-light', !isDark);
      }
    }
  }, [theme]);

  const setTheme = () => setThemeState('dark');

  const toggleTheme = () => setThemeState('dark');

  const isLight = theme === 'light';

  return (
    <AdminThemeContext.Provider value={{ theme, setTheme, toggleTheme, isLight, mounted }}>
      <div
        data-admin-theme={theme}
        className={`admin-theme-wrapper ${isLight ? 'admin-theme-light' : 'admin-theme-dark'} min-h-screen w-full transition-colors duration-200`}
      >
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}
