'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAds } from './AdProvider';

function buildDisplayDocument(zone) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=${zone.width},initial-scale=1"><style>html,body{margin:0;padding:0;width:${zone.width}px;height:${zone.height}px;overflow:hidden;background:transparent}</style></head><body><script>atOptions={'key':'${zone.key}','format':'iframe','height':${zone.height},'width':${zone.width},'params':{}};</script><script src="${zone.scriptUrl}"></script></body></html>`;
}

function buildNativeDocument(zone) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;min-height:${zone.reservedHeight}px;overflow:hidden;background:transparent}#${zone.containerId}{width:100%;min-height:${zone.reservedHeight}px}</style></head><body><script async="async" data-cfasync="false" src="${zone.scriptUrl}"></script><div id="${zone.containerId}"></div></body></html>`;
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

function AdFrame({ title, source, width, height, onLoad, responsive = false }) {
  if (!responsive) {
    return (
      <ScaledAdFrame title={title} source={source} width={width} height={height} onLoad={onLoad} />
    );
  }

  return (
    <iframe
      title={title}
      srcDoc={source}
      width={responsive ? '100%' : width}
      height={height}
      scrolling="no"
      loading="eager"
      onLoad={onLoad}
      referrerPolicy="no-referrer-when-downgrade"
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
      className="block max-w-full border-0 bg-transparent"
    />
  );
}

function ScaledAdFrame({ title, source, width, height, onLoad }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const updateScale = () => {
      const availableWidth = containerRef.current?.clientWidth || width;
      setScale(Math.min(1, availableWidth / width));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ maxWidth: width, height: height * scale }}
    >
      <iframe
        title={title}
        srcDoc={source}
        width={width}
        height={height}
        scrolling="no"
        loading="eager"
        onLoad={onLoad}
        referrerPolicy="no-referrer-when-downgrade"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
        className="absolute left-1/2 top-0 block border-0 bg-transparent"
        style={{ transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'top center' }}
      />
    </div>
  );
}

export default function AdSlot({ slotId, className = '' }) {
  const { config, pageType, resolvePlacement, emitAdEvent } = useAds();
  const placement = useMemo(() => resolvePlacement(slotId), [resolvePlacement, slotId]);
  const hostRef = useRef(null);
  const [nearViewport, setNearViewport] = useState(false);
  const { matches: isDesktop, ready: viewportReady } = useMediaQuery('(min-width: 768px)');
  const slotDefinition = placement || config.placements[slotId];
  const { matches: matchesPlacementViewport } = useMediaQuery(slotDefinition?.mediaQuery || '(min-width: 0px)');
  const viewportAllowed = !slotDefinition?.mediaQuery || matchesPlacementViewport;

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

  const renderedAd = useMemo(() => {
    // The slot owns lazy loading. Once eligible, start the iframe immediately
    // instead of waiting for a second, browser-controlled lazy-loading gate.
    if (!placement || !viewportAllowed || (placement.lazy && !nearViewport)) return null;
    if (placement.provider !== 'adsterra') return null;

    const zones = config.providers.adsterra.zones;
    if (placement.format === 'native') {
      const zone = zones.native;
      return (
        <AdFrame
          title="Native advertisement"
          source={buildNativeDocument(zone)}
          height={zone.reservedHeight}
          responsive
          onLoad={() => emitAdEvent('ad_slot_loaded', { provider: 'adsterra', slot_id: slotId, format: 'native', page_type: pageType })}
        />
      );
    }

    if (placement.format === 'square') {
      const zone = zones.square;
      return (
        <AdFrame
          title="Content advertisement"
          source={buildDisplayDocument(zone)}
          width={zone.width}
          height={zone.height}
          onLoad={() => emitAdEvent('ad_slot_loaded', { provider: 'adsterra', slot_id: slotId, format: 'square', page_type: pageType })}
        />
      );
    }

    if (placement.format === 'sidebar') {
      const zone = zones.sidebar;
      return (
        <AdFrame
          title="Sidebar advertisement"
          source={buildDisplayDocument(zone)}
          width={zone.width}
          height={zone.height}
          onLoad={() => emitAdEvent('ad_slot_loaded', { provider: 'adsterra', slot_id: slotId, format: 'sidebar', page_type: pageType })}
        />
      );
    }

    if (!viewportReady) return null;
    if (isDesktop && !config.formats.desktopBanner) return null;
    if (!isDesktop && !config.formats.mobileBanner) return null;
    const zone = isDesktop ? zones.bannerDesktop : zones.bannerMobile;
    return (
      <AdFrame
        title="Advertisement"
        source={buildDisplayDocument(zone)}
        width={zone.width}
        height={zone.height}
        onLoad={() => emitAdEvent('ad_slot_loaded', { provider: 'adsterra', slot_id: slotId, format: 'banner', page_type: pageType })}
      />
    );
  }, [config, emitAdEvent, isDesktop, nearViewport, pageType, placement, slotId, viewportReady, viewportAllowed]);

  if (!viewportAllowed) return null;
  if (!placement && !config.showDevelopmentPlaceholders) return null;

  const selectedResponsiveFormatDisabled = placement?.format === 'responsiveBanner'
    && viewportReady
    && ((isDesktop && !config.formats.desktopBanner) || (!isDesktop && !config.formats.mobileBanner));
  if (selectedResponsiveFormatDisabled && !config.showDevelopmentPlaceholders) return null;

  const isNative = slotDefinition?.format === 'native';
  const isSquare = slotDefinition?.format === 'square';
  const isSidebar = slotDefinition?.format === 'sidebar';
  const reservationClass = isNative
    ? 'min-h-[358px]'
    : isSidebar
      ? 'min-h-[638px]'
    : isSquare
      ? 'min-h-[288px]'
      : 'min-h-[88px] md:min-h-[128px]';
  const placeholderClass = isNative
    ? 'min-h-[320px]'
    : isSidebar
      ? 'min-h-[600px]'
    : isSquare
      ? 'min-h-[250px]'
      : 'min-h-[50px] md:min-h-[90px]';

  return (
    <aside
      ref={hostRef}
      aria-label="Advertisement"
      data-ad-slot={slotId}
      className={`mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.015] px-2 py-3 ${reservationClass} ${className}`}
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Advertisement</span>
      {renderedAd || (
        <div className={`flex w-full items-center justify-center text-[10px] text-slate-700 ${placeholderClass}`}>
          {config.showDevelopmentPlaceholders ? `${isNative ? 'Native' : isSidebar ? '160×600' : isSquare ? '300×250' : 'Responsive'} advertisement — ${slotId}` : null}
        </div>
      )}
    </aside>
  );
}
