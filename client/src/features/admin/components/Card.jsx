'use client';

import React from 'react';

export default function Card({ title, description, actions, children, className = '' }) {
  return (
    <section className={`studio-card rounded-[16px] overflow-hidden ${className}`} aria-label={title}>
      <header className="studio-card-header flex items-center justify-between flex-wrap gap-3 px-6 py-4 border-b border-[var(--studio-border)] bg-[var(--studio-raised)]/40">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[var(--studio-text)] tracking-tight">{title}</h2>
          {description && <p className="text-xs font-normal text-[var(--studio-muted)] mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </header>
      <div className="studio-card-body p-6">{children}</div>
    </section>
  );
}
