'use client';

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '@/services/api/apiClient';
import { defaultSiteContent, mergeSiteContent } from '@/config/siteContent';

export const SiteContentContext = createContext({
  content: defaultSiteContent,
  loading: true,
  refreshSiteContent: () => {}
});

// Astro hydrates the navbar and page content as separate React islands. Share
// an in-flight request so those islands don't all fetch the same site settings.
let siteContentRequest = null;

export const SiteContentProvider = ({ children, initialContent }) => {
  const [content, setContent] = useState(() => 
    initialContent ? mergeSiteContent(defaultSiteContent, initialContent) : defaultSiteContent
  );
  const [loading, setLoading] = useState(!initialContent);

  const refreshSiteContent = useCallback(async () => {
    try {
      siteContentRequest ||= apiClient.get('/api/site-content').finally(() => {
        siteContentRequest = null;
      });
      const res = await siteContentRequest;
      setContent(mergeSiteContent(defaultSiteContent, res.data || {}));
    } catch (error) {
      if (!initialContent) {
        setContent(defaultSiteContent);
      }
    } finally {
      setLoading(false);
    }
  }, [initialContent]);

  useEffect(() => {
    // Always reconcile the server-rendered snapshot once in the browser.
    // This makes an admin save visible on the next public page load even if
    // a warm server instance had rendered an older layout snapshot.
    void refreshSiteContent();
  }, [refreshSiteContent]);

  useEffect(() => {
    const faviconUrl = content?.brand?.faviconUrl || content?.brand?.logoUrl;
    if (!faviconUrl) return;
    let icon = document.querySelector('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement('link');
      icon.setAttribute('rel', 'icon');
      document.head.appendChild(icon);
    }
    icon.setAttribute('href', faviconUrl);
  }, [content?.brand?.faviconUrl, content?.brand?.logoUrl]);

  // Keep both names while older admin screens migrate. SiteManager uses the
  // short `refresh` contract after a save; public consumers use the explicit
  // name. They intentionally point to the same in-flight-safe function.
  const value = useMemo(() => ({
    content,
    loading,
    refreshSiteContent,
    refresh: refreshSiteContent,
  }), [content, loading, refreshSiteContent]);

  return (
    <SiteContentContext.Provider value={value}>
      {children}
    </SiteContentContext.Provider>
  );
};
