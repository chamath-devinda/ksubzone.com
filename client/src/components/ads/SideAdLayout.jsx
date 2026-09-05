'use client';

import React from 'react';
import { AD_MODES } from '@/config/ads';
import { useAds } from './AdProvider';
import AdSlot from './AdSlot';

export default function SideAdLayout({ children, slotPrefix = 'single', enabled = true }) {
  const { config, pageType, pathname, resolvePlacement } = useAds();

  const hasMultiSlots = Boolean(config.placements?.[`${slotPrefix}_sidebar_left_1`]);
  const leftSlots = hasMultiSlots
    ? [`${slotPrefix}_sidebar_left_1`, `${slotPrefix}_sidebar_left_2`, `${slotPrefix}_sidebar_left_3`]
    : [`${slotPrefix}_sidebar_left`];
  const rightSlots = hasMultiSlots
    ? [`${slotPrefix}_sidebar_right_1`, `${slotPrefix}_sidebar_right_2`, `${slotPrefix}_sidebar_right_3`]
    : [`${slotPrefix}_sidebar_right`];

  const primaryLeft = leftSlots[0];
  const route = config.routes[pageType];
  const showRails = enabled && (
    leftSlots.some((slot) => Boolean(resolvePlacement(slot))) || (
      config.showDevelopmentPlaceholders
      && config.mode !== AD_MODES.OFF
      && config.placements[primaryLeft]?.pages.includes(pageType)
      && route?.enabled
      && route.sidebar
      && config.formats.sidebar
    )
  );

  if (!showRails) return children;

  return (
    <div className="side-ad-layout" data-ad-layout={slotPrefix}>
      <aside className="side-ad-rail" aria-label="Left advertisements">
        <div className="flex flex-col gap-10">
          {leftSlots.map((slotId, index) => (
            <AdSlot
              key={`${pathname}:${slotId}`}
              slotId={slotId}
              className={`max-w-[184px] ${index === leftSlots.length - 1 ? 'sticky top-28' : ''}`}
            />
          ))}
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
      <aside className="side-ad-rail" aria-label="Right advertisements">
        <div className="flex flex-col gap-10">
          {rightSlots.map((slotId, index) => (
            <AdSlot
              key={`${pathname}:${slotId}`}
              slotId={slotId}
              className={`max-w-[184px] ${index === rightSlots.length - 1 ? 'sticky top-28' : ''}`}
            />
          ))}
        </div>
      </aside>
    </div>
  );
}
