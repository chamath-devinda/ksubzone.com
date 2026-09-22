'use client';

// Clean layout wrapper that preserves full content width across all screen sizes
// without creating empty sidebar gutters or squashing cinematic hero banners.
export default function SideAdLayout({ children }) {
  return (
    <div className="w-full min-w-0">
      {children}
    </div>
  );
}

