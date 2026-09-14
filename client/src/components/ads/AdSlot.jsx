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
  const [adLoaded, setAdLoaded] = useState(false);
  const [nearViewport, setNearViewport] = useState(false);
  const { matches: isDesktop, ready: desktopReady } = useMediaQuery('(min-width: 768px)');
  const { matches: isTablet, ready: tabletReady } = useMediaQuery('(min-width: 640px) and (max-width: 767px)');
  const viewportReady = desktopReady && tabletReady;

  const slotDefinition = config?.slots?.[slotId];
  const isResponsiveBanner = slotDefinition?.format === 'banner';
  const isNativePlacement = slotDefinition?.format === 'native';

  const zoneName = useMemo(() => {
    if (!slotDefinition) return '';
    if (!isResponsiveBanner) return slotDefinition.zone;
    if (isDesktop) return slotDefinition.zones?.desktop || 'bannerDesktop';
    if (isTablet) return slotDefinition.zones?.tablet || 'bannerTablet';
    return slotDefinition.zones?.mobile || 'bannerMobile';
  }, [isDesktop, isResponsiveBanner, isTablet, slotDefinition]);

  const zone = config?.adsterra?.zones?.[zoneName];

  const selectedResponsiveFormatDisabled = useMemo(() => {
    if (!isResponsiveBanner) return false;
    if (isDesktop) return config?.displayFormats?.bannerDesktop === false;
    if (isTablet) return config?.displayFormats?.bannerTablet === false;
    return config?.displayFormats?.bannerMobile === false;
  }, [config?.displayFormats, isDesktop, isResponsiveBanner, isTablet]);

  const viewportAllowed = useMemo(() => {
    if (placement?.devices === 'desktop_only') return isDesktop;
    if (placement?.devices === 'mobile_only') return !isDesktop;
    return true;
  }, [isDesktop, placement?.devices]);

  useEffect(() => {
    setAdLoaded(false);
  }, [slotId, zoneName]);

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

  const source = useMemo(() => zone ? buildAdFrameUrl(zoneName) : '', [zone, zoneName]);

  // Execute the official publisher Adsterra codes directly
  const canRender = placement?.provider === 'adsterra' && zone && viewportAllowed
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
    />
  ) : null;

  if (!viewportAllowed) return null;
  if (!placement) return null;
  if (selectedResponsiveFormatDisabled) return null;

  const isNative = slotDefinition?.format === 'native';
  const isSquare = slotDefinition?.format === 'square';
  const isSidebar = slotDefinition?.format === 'sidebar';

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
          : 'border-white/[0.03] bg-white/[0.008] px-2 py-3'
      } ${reservationClass} ${className}`}
    >
      {!slotId.includes('sticky') && (
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Advertisement</span>
      )}
      {renderedAd}
    </aside>
  );
}
