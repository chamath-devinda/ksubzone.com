'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAds } from './AdProvider';
import AdFrame from './AdFrame';

function buildAdFrameUrl(zoneName) {
  // A real same-origin frame URL preserves the publisher page as the referrer.
  // Ad networks reject `srcDoc` documents because they have an empty referrer.
  return `/ad-frame.html?zone=${encodeURIComponent(zoneName)}`;
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
  const { config, pageType, resolvePlacement, emitAdEvent } = useAds();
  const placement = useMemo(() => resolvePlacement(slotId), [resolvePlacement, slotId]);
  const hostRef = useRef(null);
  const [slotFailed, setSlotFailed] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [nearViewport, setNearViewport] = useState(false);
  const { matches: isDesktop, ready: desktopReady } = useMediaQuery('(min-width: 768px)');
  const { matches: isTablet, ready: tabletReady } = useMediaQuery('(min-width: 480px)');
  const viewportReady = desktopReady && tabletReady;
  const slotDefinition = placement || config.placements[slotId];
  const { matches: matchesPlacementViewport } = useMediaQuery(slotDefinition?.mediaQuery || '(min-width: 0px)');
  const viewportAllowed = !slotDefinition?.mediaQuery || matchesPlacementViewport;

  const isResponsiveBanner = placement?.format === 'responsiveBanner';
  const selectedResponsiveFormatDisabled = isResponsiveBanner && viewportReady
    && ((isDesktop && !config.formats.desktopBanner) || (!isDesktop && !config.formats.mobileBanner));

  const zoneName = isResponsiveBanner
    ? (isDesktop ? 'bannerDesktop' : (isTablet ? 'bannerTablet' : 'bannerMobile'))
    : placement?.format;
  const zone = config.providers.adsterra.zones[zoneName] || config.providers.adsterra.zones.bannerMobile;
  const isNativePlacement = placement?.format === 'native';

  useEffect(() => {
    setAdLoaded(false);
    setSlotFailed(false);
  }, [slotId, zoneName]);

  useEffect(() => {
    if (!placement || !viewportAllowed) return;
    emitAdEvent('provider_selected', {
      provider: placement.provider,
      slot_id: slotId,
      format: placement.format,
      page_type: pageType,
    });
  }, [emitAdEvent, pageType, placement, slotId, viewportAllowed]);

  useEffect(() => {
    if (!placement?.lazy || !viewportAllowed) return undefined;
    if (nearViewport || !hostRef.current) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setNearViewport(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '1200px 0px' });
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, [nearViewport, placement, viewportAllowed]);

  const source = useMemo(() => zone ? buildAdFrameUrl(zoneName) : '', [zone, zoneName]);

  // Execute the official publisher Adsterra codes directly
  const canRender = placement?.provider === 'adsterra' && zone && viewportAllowed && !slotFailed
    && (!placement.lazy || nearViewport)
    && (!isResponsiveBanner || (viewportReady && !selectedResponsiveFormatDisabled));

  const eventDetail = {
    provider: placement?.provider, slot_id: slotId,
    format: isResponsiveBanner ? 'banner' : placement?.format, page_type: pageType,
  };

  const renderedAd = canRender ? (
    <AdFrame
      key={`${slotId}:${zone.scriptUrl}:${zoneName}`}
      title={isNativePlacement ? 'Native advertisement' : placement.format === 'sidebar' ? 'Sidebar advertisement' : 'Advertisement'}
      source={source}
      width={zone.width}
      height={isNativePlacement ? zone.reservedHeight : zone.height}
      responsive={isNativePlacement}
      onLoad={() => {
        setAdLoaded(true);
        emitAdEvent('ad_slot_loaded', eventDetail);
      }}
      onUnavailable={(reason) => {
        setSlotFailed(true);
        emitAdEvent('ad_slot_failed', { ...eventDetail, reason });
      }}
    />
  ) : null;

  if (!viewportAllowed) return null;
  if (!placement) return null;
  if (selectedResponsiveFormatDisabled) return null;
  if (slotFailed) return null;

  const isNative = slotDefinition?.format === 'native';
  const isSquare = slotDefinition?.format === 'square';
  const isSidebar = slotDefinition?.format === 'sidebar';
  const isLazyWaiting = Boolean(placement?.lazy && !nearViewport);
  if (!renderedAd && !isLazyWaiting) return null;

  const reservationClass = isNative
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
