'use client';

import AdSlot from './AdSlot';

// The individual slots remain guarded by their desktop media query, so these
// rails do not request 160x600 inventory on phones or normal laptop widths.
export default function SideAdLayout({ children, enabled = true, slotPrefix = 'single' }) {
  if (!enabled) return children;

  return (
    <div className="mx-auto grid w-full max-w-[1920px] grid-cols-1 gap-5 2xl:grid-cols-[160px_minmax(0,1fr)_160px] 2xl:gap-6">
      <aside aria-label="Left advertising rail" className="hidden 2xl:flex flex-col items-center gap-6 pt-8">
        {[1, 2, 3].map((index) => <AdSlot key={index} slotId={`${slotPrefix}_sidebar_left_${index}`} />)}
      </aside>
      <div className="min-w-0">{children}</div>
      <aside aria-label="Right advertising rail" className="hidden 2xl:flex flex-col items-center gap-6 pt-8">
        {[1, 2, 3].map((index) => <AdSlot key={index} slotId={`${slotPrefix}_sidebar_right_${index}`} />)}
      </aside>
    </div>
  );
}
