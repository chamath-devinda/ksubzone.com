'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AD_MODES, adConfig, getAdPageType } from '@/config/ads';

const AdContext = createContext(null);

function emitAdEvent(name, detail = {}) {
  if (typeof window === 'undefined') return;
  const payload = { event: name, ...detail };
  window.dispatchEvent(new CustomEvent(`ksubzone:${name}`, { detail: payload }));
  if (Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
}

function providerIsConfigured(provider) {
  if (provider === 'adsterra') {
    const zones = adConfig.providers.adsterra.zones;
    return Boolean(zones.bannerDesktop.key || zones.bannerMobile.key || zones.square.key || zones.native.scriptUrl);
  }
  if (provider === 'monetag') {
    const zones = adConfig.providers.monetag.zones;
    return Boolean(zones.multiTagScriptUrl || zones.inPagePushScriptUrl || zones.onClickScriptUrl);
  }
  return false;
}

function IntrusiveAdLoader({ pageType, provider }) {
  useEffect(() => {
    const route = adConfig.routes[pageType];
    const isAdsterra = provider === 'adsterra';
    const scriptUrl = isAdsterra
      ? adConfig.providers.adsterra.zones.popunder.scriptUrl
      : adConfig.providers.monetag.zones.onClickScriptUrl;
    const canLoad = adConfig.enabled
      && route?.enabled
      && route?.intrusive
      && adConfig.formats.popunder
      && adConfig.providers[provider]?.enabled
      && scriptUrl;

    if (!canLoad) return undefined;

    let script = null;
    const activate = () => {
      if (window.__ksubzoneIntrusiveAdLoaded) return;
      let lastLoaded = 0;
      try {
        lastLoaded = Number(window.localStorage.getItem(adConfig.intrusive.storageKey) || 0);
      } catch {
        // Storage may be unavailable in strict privacy modes; ad loading still remains guarded per page.
      }
      if (Date.now() - lastLoaded < adConfig.intrusive.popunderCooldownMs) return;
      const marker = `${provider}-intrusive`;
      if (document.querySelector(`script[data-ksubzone-ad="${marker}"]`)) return;

      script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.dataset.ksubzoneAd = marker;
      script.onload = () => emitAdEvent('ad_slot_loaded', { provider, format: 'intrusive', page_type: pageType });
      window.__ksubzoneIntrusiveAdLoaded = true;
      document.body.appendChild(script);
      try {
        window.localStorage.setItem(adConfig.intrusive.storageKey, String(Date.now()));
      } catch {
        // Ignore blocked storage; the DOM marker still prevents duplicate loading on this page.
      }
    };

    window.addEventListener('pointerdown', activate, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', activate);
      if (script?.parentNode) script.parentNode.removeChild(script);
    };
  }, [pageType, provider]);

  return null;
}

function SocialBarLoader({ pageType, provider }) {
  useEffect(() => {
    const route = adConfig.routes[pageType];
    const scriptUrl = adConfig.providers.adsterra.zones.socialBar.scriptUrl;
    const canLoad = adConfig.enabled
      && route?.enabled
      && route?.intrusive
      && provider === 'adsterra'
      && adConfig.providers.adsterra.enabled
      && adConfig.formats.socialBar
      && scriptUrl;

    if (!canLoad || window.__ksubzoneSocialBarLoaded) return undefined;

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.dataset.ksubzoneAd = 'adsterra-social-bar';
    script.onload = () => emitAdEvent('ad_slot_loaded', { provider: 'adsterra', format: 'social_bar', page_type: pageType });
    window.__ksubzoneSocialBarLoaded = true;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [pageType, provider]);

  return null;
}

export function AdProvider({ children }) {
  const pathname = usePathname();
  const pageType = getAdPageType(pathname);
  const [variant, setVariant] = useState('A');
  const [variantReady, setVariantReady] = useState(adConfig.mode !== AD_MODES.AB_TEST);

  useEffect(() => {
    if (adConfig.mode !== AD_MODES.AB_TEST) return;
    let stored = null;
    try {
      stored = window.localStorage.getItem(adConfig.experiments.storageKey);
    } catch {
      // Fall back to an in-memory assignment if storage is blocked.
    }
    const assigned = stored === 'A' || stored === 'B'
      ? stored
      : (Math.random() * 100 < adConfig.experiments.adsterraPercentage ? 'A' : 'B');
    try {
      window.localStorage.setItem(adConfig.experiments.storageKey, assigned);
    } catch {
      // The assignment remains stable for the lifetime of this mounted provider.
    }
    setVariant(assigned);
    setVariantReady(true);
    emitAdEvent('ad_variant_assigned', { variant: assigned, page_type: getAdPageType(window.location.pathname) });
  }, []);

  const defaultProvider = useMemo(() => {
    if (adConfig.mode === AD_MODES.MONETAG_ONLY) return 'monetag';
    if (adConfig.mode === AD_MODES.AB_TEST) return variantReady ? (variant === 'A' ? 'adsterra' : 'monetag') : null;
    return 'adsterra';
  }, [variant, variantReady]);

  const activeProvider = useMemo(() => {
    if (!defaultProvider) return null;
    if (providerIsConfigured(defaultProvider) && adConfig.providers[defaultProvider]?.enabled) return defaultProvider;
    if (![AD_MODES.HYBRID, AD_MODES.AB_TEST].includes(adConfig.mode)) return defaultProvider;
    const fallback = defaultProvider === 'adsterra' ? 'monetag' : 'adsterra';
    return providerIsConfigured(fallback) && adConfig.providers[fallback]?.enabled ? fallback : defaultProvider;
  }, [defaultProvider]);

  const resolvePlacement = useCallback((slotId) => {
    const placement = adConfig.placements[slotId];
    const route = adConfig.routes[pageType];
    if (!adConfig.enabled || adConfig.mode === AD_MODES.OFF || !route?.enabled || !placement) return null;
    if (adConfig.mode === AD_MODES.AB_TEST && !variantReady) return null;
    if (!placement.pages.includes(pageType)) return null;
    if (placement.format === 'native' && (!route.native || !adConfig.formats.native)) return null;
    if (placement.format === 'square' && (!route.square || !adConfig.formats.square)) return null;
    if (placement.format === 'responsiveBanner' && (!route.banner || !adConfig.formats.banner)) return null;

    let provider = adConfig.mode === AD_MODES.HYBRID ? placement.provider : defaultProvider;
    const providerConfig = adConfig.providers[provider];
    if (!providerConfig?.enabled || !providerIsConfigured(provider)) {
      if (![AD_MODES.HYBRID, AD_MODES.AB_TEST].includes(adConfig.mode)) return null;
      provider = provider === 'adsterra' ? 'monetag' : 'adsterra';
    }
    if (!adConfig.providers[provider]?.enabled || !providerIsConfigured(provider)) return null;

    return { ...placement, provider };
  }, [defaultProvider, pageType, variantReady]);

  const contextValue = useMemo(() => ({
    config: adConfig,
    pageType,
    pathname,
    variant,
    resolvePlacement,
    emitAdEvent,
  }), [pageType, pathname, variant, resolvePlacement]);

  return (
    <AdContext.Provider value={contextValue}>
      {children}
      <IntrusiveAdLoader pageType={pageType} provider={activeProvider} />
      <SocialBarLoader pageType={pageType} provider={activeProvider} />
    </AdContext.Provider>
  );
}

export function useAds() {
  const context = useContext(AdContext);
  if (!context) throw new Error('useAds must be used inside AdProvider');
  return context;
}
