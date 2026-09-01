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
  return (
    <iframe
      title={title}
      srcDoc={source}
      width={responsive ? '100%' : width}
      height={height}
      scrolling="no"
      loading="lazy"
      onLoad={onLoad}
      referrerPolicy="no-referrer-when-downgrade"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
      className="block max-w-full border-0 bg-transparent"
    />
  );
}

export default function AdSlot({ slotId, className = '' }) {
  const { config, pageType, resolvePlacement, emitAdEvent } = useAds();
  const placement = useMemo(() => resolvePlacement(slotId), [resolvePlacement, slotId]);
  const hostRef = useRef(null);
  const [nearViewport, setNearViewport] = useState(!placement?.lazy);
  const { matches: isDesktop, ready: viewportReady } = useMediaQuery('(min-width: 640px)');

  useEffect(() => {
    if (!placement) return;
    emitAdEvent('provider_selected', {
      provider: placement.provider,
      slot_id: slotId,
      format: placement.format,
      page_type: pageType,
    });
  }, [emitAdEvent, pageType, placement, slotId]);

  useEffect(() => {
    if (!placement?.lazy || nearViewport || !hostRef.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '500px 0px' });
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, [nearViewport, placement?.lazy]);

  const renderedAd = useMemo(() => {
    if (!placement || !nearViewport) return null;
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

    if (!viewportReady) return null;
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
  }, [config, emitAdEvent, isDesktop, nearViewport, pageType, placement, slotId, viewportReady]);

  if (!placement && !config.showDevelopmentPlaceholders) return null;

  const isNative = placement?.format === 'native';
  const reservationClass = isNative ? 'min-h-[358px]' : 'min-h-[288px] sm:min-h-[98px]';
  const placeholderClass = isNative ? 'min-h-[320px]' : 'min-h-[250px] sm:min-h-[60px]';

  return (
    <aside
      ref={hostRef}
      aria-label="Advertisement"
      className={`mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.015] px-2 py-3 ${reservationClass} ${className}`}
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Advertisement</span>
      {renderedAd || (
        <div className={`flex w-full items-center justify-center text-[10px] text-slate-700 ${placeholderClass}`}>
          {config.showDevelopmentPlaceholders ? `${isNative ? 'Native' : 'Responsive'} advertisement — ${slotId}` : null}
        </div>
      )}
    </aside>
  );
}
