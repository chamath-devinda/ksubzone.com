import Link from 'next/link';
import { buildBreadcrumbSchema, serializeJsonLd } from '@/utils/seo';

export default function Breadcrumbs({ items, className = '' }) {
  if (!Array.isArray(items) || items.length < 2) return null;
  const schema = buildBreadcrumbSchema(items);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
      />
      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          {items.map((item, index) => {
            const isCurrent = index === items.length - 1;
            return (
              <li key={`${item.url}-${item.name}`} className="flex min-w-0 items-center gap-2">
                {index > 0 && <span aria-hidden="true">/</span>}
                {isCurrent ? (
                  <span aria-current="page" className="truncate text-slate-200">{item.name}</span>
                ) : (
                  <Link href={item.url} className="transition hover:text-white">{item.name}</Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
