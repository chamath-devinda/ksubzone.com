'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAds } from './AdProvider';
import AdFrame from './AdFrame';

function buildDisplayDocument(zone) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=${zone.width},initial-scale=1"><style>html,body{margin:0;padding:0;width:${zone.width}px;height:${zone.height}px;overflow:hidden;background:transparent;color-scheme:dark}</style></head><body><script>atOptions={'key':'${zone.key}','format':'iframe','height':${zone.height},'width':${zone.width},'params':{}};</script><script src="${zone.scriptUrl}"></script></body></html>`;
}

function buildNativeDocument(zone) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;min-height:${zone.reservedHeight}px;overflow:hidden;background:transparent;color-scheme:dark}#${zone.containerId}{width:100%;min-height:${zone.reservedHeight}px}</style></head><body><script async="async" data-cfasync="false" src="${zone.scriptUrl}"></script><div id="${zone.containerId}"></div></body></html>`;
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
  const [failedZone, setFailedZone] = useState(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [nearViewport, setNearViewport] = useState(false);
  const { matches: isDesktop, ready: viewportReady } = useMediaQuery('(min-width: 768px)');
  const slotDefinition = placement || config.placements[slotId];
  const { matches: matchesPlacementViewport } = useMediaQuery(slotDefinition?.mediaQuery || '(min-width: 0px)');
  const viewportAllowed = !slotDefinition?.mediaQuery || matchesPlacementViewport;

  const isResponsiveBanner = placement?.format === 'responsiveBanner';
  const selectedResponsiveFormatDisabled = isResponsiveBanner && viewportReady
    && ((isDesktop && !config.formats.desktopBanner) || (!isDesktop && !config.formats.mobileBanner));
  const zoneName = isResponsiveBanner ? (isDesktop ? 'bannerDesktop' : 'bannerMobile') : placement?.format;
  const zone = config.providers.adsterra.zones[zoneName];
  const isNativePlacement = placement?.format === 'native';

  useEffect(() => {
    setAdLoaded(false);
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
    }, { rootMargin: '1000px 0px' });
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, [nearViewport, placement, viewportAllowed]);
  const source = useMemo(() => zone
    ? (isNativePlacement ? buildNativeDocument(zone) : buildDisplayDocument(zone))
    : '', [isNativePlacement, zone]);
  const failed = Boolean(zone && failedZone === zone.scriptUrl);
  const canRender = placement?.provider === 'adsterra' && zone && viewportAllowed && !failed
    && (!placement.lazy || nearViewport)
    && (!isResponsiveBanner || (viewportReady && !selectedResponsiveFormatDisabled));
  const eventDetail = {
    provider: placement?.provider, slot_id: slotId,
    format: isResponsiveBanner ? 'banner' : placement?.format, page_type: pageType,
  };
  const renderedAd = canRender ? (
    <AdFrame
      key={zone.scriptUrl}
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
        setAdLoaded(false);
        setFailedZone(zone.scriptUrl);
        emitAdEvent('ad_slot_failed', { ...eventDetail, reason });
      }}
    />
  ) : null;

  if (!viewportAllowed || failed) return null;
  if (!placement && !config.showDevelopmentPlaceholders) return null;

  if (selectedResponsiveFormatDisabled && !config.showDevelopmentPlaceholders) return null;

  const isNative = slotDefinition?.format === 'native';
  const isSquare = slotDefinition?.format === 'square';
  const isSidebar = slotDefinition?.format === 'sidebar';
  const isDevPlaceholder = config.showDevelopmentPlaceholders && !renderedAd;

  if (!renderedAd && !isDevPlaceholder) return null;

  const reservationClass = isNative
    ? 'min-h-[358px]'
    : isSidebar
      ? (adLoaded ? 'min-h-[624px]' : 'min-h-0')
    : isSquare
      ? (adLoaded ? 'min-h-[288px]' : 'min-h-0')
      : (adLoaded ? 'min-h-[88px] md:min-h-[128px]' : 'min-h-0');
  const placeholderClass = isNative
    ? 'min-h-[320px]'
    : isSidebar
      ? 'min-h-[600px]'
    : isSquare
      ? 'min-h-[250px]'
      : 'min-h-[50px] md:min-h-[90px]';

  const containerVisibility = adLoaded || isDevPlaceholder
    ? 'border-white/[0.05] bg-white/[0.015] opacity-100'
    : 'border-transparent bg-transparent opacity-0 pointer-events-none';

  return (
    <aside
      ref={hostRef}
      aria-label="Advertisement"
      data-ad-slot={slotId}
      className={`mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border px-2 py-3 transition-all duration-300 ${containerVisibility} ${reservationClass} ${className}`}
    >
      {(adLoaded || isDevPlaceholder) && (
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Advertisement</span>
      )}
      {renderedAd || (
        <div className={`flex w-full items-center justify-center text-[10px] text-slate-700 ${placeholderClass}`}>
          {isDevPlaceholder ? `${isNative ? 'Native' : isSidebar ? '160×600' : isSquare ? '300×250' : 'Responsive'} advertisement — ${slotId}` : null}
        </div>
      )}
    </aside>
  );
}
