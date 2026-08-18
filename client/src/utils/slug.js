export const slugify = (value = '') => String(value)
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export const cleanSlug = (slug = '') => String(slug).replace(/-\d+$/, '');

export const normalizePermalinkSlug = (value = '') => {
  let slug = String(value || '').trim();
  if (!slug) return '';

  slug = decodeURIComponent(slug);
  slug = slug.split('#')[0].split('?')[0].replace(/^\/+|\/+$/g, '');

  const routeMatch = slug.match(/(?:^|\/)(?:movie|drama)\/([^/?#]+)/gi);
  if (routeMatch && routeMatch.length > 0) {
    slug = routeMatch[routeMatch.length - 1].replace(/^\/?(?:movie|drama)\//i, '');
  }

  if (/https?:\/\//i.test(slug)) {
    const parts = slug.split(/https?:\/\/[^/]+\/(?:movie|drama)\//i).filter(Boolean);
    slug = parts.length > 0 ? parts[parts.length - 1] : slug;
  }

  return slugify(slug);
};

export const permalinkSlug = (item = {}) => {
  const slug = normalizePermalinkSlug(item.slug || '');
  if (slug) {
    return slug;
  }

  return slugify(item.title || '');
};
