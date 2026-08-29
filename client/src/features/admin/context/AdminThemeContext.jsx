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
  const [theme, setThemeState] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('ksz-admin-theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
      }
    } catch (_) {}
    setMounted(true);
  }, []);

  const setTheme = (newTheme) => {
    const validTheme = newTheme === 'light' ? 'light' : 'dark';
    setThemeState(validTheme);
    try {
      localStorage.setItem('ksz-admin-theme', validTheme);
    } catch (_) {}
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isLight = theme === 'light';

  return (
    <AdminThemeContext.Provider value={{ theme, setTheme, toggleTheme, isLight, mounted }}>
      <div
        data-admin-theme={theme}
        className={`admin-theme-wrapper ${isLight ? 'admin-theme-light' : 'admin-theme-dark'} min-h-screen w-full`}
      >
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}
