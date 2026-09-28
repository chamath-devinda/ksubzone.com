'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAds } from './AdProvider';
import AdFrame from './AdFrame';

function buildAdFrameUrl(zoneName, retryAttempt = 0) {
  // A real same-origin frame URL preserves the publisher page as the referrer.
  // Ad networks reject `srcDoc` documents because they have an empty referrer.
  return `/ad-frame.html?zone=${encodeURIComponent(zoneName)}&retry=${retryAttempt}`;
}

function useMediaQuery(query) {
  const [state, setState] = useState({ matches: false, ready: false });
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setState({ matches: media.matches, ready: true });
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, [query]);
  return state;
}

export default function AdSlot({ slotId, className = '' }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { config, pageType, resolvePlacement, emitAdEvent } = useAds();
  const placement = useMemo(() => resolvePlacement(slotId), [resolvePlacement, slotId]);
  const hostRef = useRef(null);
  const retryTimerRef = useRef(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [nearViewport, setNearViewport] = useState(false);

  const { matches: isDesktop, ready: desktopReady } = useMediaQuery('(min-width: 768px)');
  const { matches: isTablet, ready: tabletReady } = useMediaQuery('(min-width: 480px) and (max-width: 767px)');
  const viewportReady = desktopReady && tabletReady;

  const { matches: matchesPlacementViewport } = useMediaQuery(
    placement?.mediaQuery || '(min-width: 0px)'
  );
  const viewportAllowed = mounted && (!placement?.mediaQuery || matchesPlacementViewport);

  const isResponsiveBanner = placement?.format === 'responsiveBanner';
  const isNativePlacement = placement?.format === 'native';
  const isSquare = placement?.format === 'square';
  const isSidebar = placement?.format === 'sidebar';

  const zoneName = useMemo(() => {
    if (!placement) return '';
    if (isResponsiveBanner) {
      if (isDesktop) return 'bannerDesktop';
      if (isTablet) return 'bannerTablet';
      return 'bannerMobile';
    }
    return placement.format;
  }, [isDesktop, isResponsiveBanner, isTablet, placement]);

  const zone = config?.providers?.adsterra?.zones?.[zoneName];

  const selectedResponsiveFormatDisabled = useMemo(() => {
    if (!isResponsiveBanner) return false;
    if (isDesktop) return config?.formats?.desktopBanner === false;
    if (isTablet) return config?.formats?.bannerTablet === false;
    return config?.formats?.mobileBanner === false;
  }, [config?.formats, isDesktop, isResponsiveBanner, isTablet]);

  useEffect(() => {
    setAdLoaded(false);
    setRetryAttempt(0);
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [slotId, zoneName, pageType]);

  useEffect(() => {
    if (!hostRef.current) return undefined;
    if (!placement?.lazy) {
      setNearViewport(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '1200px 0px' });
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, [nearViewport, placement, viewportAllowed]);

  const source = useMemo(
    () => (zone && zoneName ? buildAdFrameUrl(zoneName, retryAttempt) : ''),
    [retryAttempt, zone, zoneName]
  );

  // Execute the official publisher Adsterra codes directly
  const canRender = Boolean(
    placement?.provider === 'adsterra'
    && zone
    && viewportAllowed
    && (!placement.lazy || nearViewport)
    && (!isResponsiveBanner || (viewportReady && !selectedResponsiveFormatDisabled))
  );

  const eventDetail = {
    provider: placement?.provider,
    slot_id: slotId,
    format: isResponsiveBanner ? 'banner' : placement?.format,
    page_type: pageType,
  };

  const renderedAd = canRender ? (
    <AdFrame
      key={`${slotId}:${zoneName}:${retryAttempt}`}
      title={isNativePlacement ? 'Native advertisement' : isSidebar ? 'Sidebar advertisement' : 'Advertisement'}
      source={source}
      width={zone.width}
      height={isNativePlacement ? (zone.reservedHeight || 320) : zone.height}
      responsive={isNativePlacement}
      onLoad={() => {
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
        setAdLoaded(true);
        emitAdEvent('ad_slot_loaded', eventDetail);
      }}
      onUnavailable={(reason) => {
        emitAdEvent('ad_slot_failed', { ...eventDetail, reason });
        // Keep the real Adsterra slot mounted and retry with a cache-busted
        // frame. Do not replace an unfilled provider slot with a local promo.
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        const delay = Math.min(60_000, 5_000 * (2 ** Math.min(retryAttempt, 3)));
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          setAdLoaded(false);
          setRetryAttempt((attempt) => attempt + 1);
        }, delay);
      }}
    />
  ) : null;

  if (!viewportAllowed) return null;
  if (!placement) return null;
  if (selectedResponsiveFormatDisabled) return null;
  const reservationClass = isNativePlacement
    ? 'min-h-[280px]'
    : isSidebar
      ? 'min-h-[600px]'
      : isSquare
        ? 'min-h-[250px]'
        : 'min-h-[66px] md:min-h-[106px]';

  return (
    <aside
      ref={hostRef}
      aria-label="Advertisement"
      data-ad-slot={slotId}
      className={`mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border transition-all duration-300 ${
        adLoaded
          ? 'border-white/[0.05] bg-white/[0.015] px-2 py-3'
          : 'border-transparent bg-transparent p-0'
      } ${reservationClass} ${className}`}
    >
      {!slotId.includes('sticky') && adLoaded && (
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Advertisement</span>
      )}
      {renderedAd}
    </aside>
  );
}
