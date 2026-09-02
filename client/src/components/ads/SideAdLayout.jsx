'use client';

import React from 'react';
import { AD_MODES } from '@/config/ads';
import { useAds } from './AdProvider';
import AdSlot from './AdSlot';

export default function SideAdLayout({ children, slotPrefix = 'single', enabled = true }) {
  const { config, pageType, pathname, resolvePlacement } = useAds();
  const leftSlot = `${slotPrefix}_sidebar_left`;
  const rightSlot = `${slotPrefix}_sidebar_right`;
  const route = config.routes[pageType];
  const showRails = enabled && (Boolean(resolvePlacement(leftSlot)) || (
    config.showDevelopmentPlaceholders
    && config.mode !== AD_MODES.OFF
    && config.placements[leftSlot]?.pages.includes(pageType)
    && route?.enabled
    && route.sidebar
    && config.formats.sidebar
  ));

  if (!showRails) return children;

  return (
    <div className="side-ad-layout" data-ad-layout={slotPrefix}>
      <div className="side-ad-rail">
        <AdSlot key={`${pathname}:${leftSlot}`} slotId={leftSlot} className="sticky top-28 max-w-[184px]" />
      </div>
      <div className="min-w-0">{children}</div>
      <div className="side-ad-rail">
        <AdSlot key={`${pathname}:${rightSlot}`} slotId={rightSlot} className="sticky top-28 max-w-[184px]" />
      </div>
    </div>
  );
}
