export function usePathname(): string {
  if (typeof window !== 'undefined') {
    return window.location.pathname;
  }
  return '/';
}

export function useRouter() {
  return {
    push: (url: string) => {
      if (typeof window !== 'undefined') {
        window.location.assign(url);
      }
    },
    replace: (url: string) => {
      if (typeof window !== 'undefined') {
        window.location.replace(url);
      }
    },
    back: () => {
      if (typeof window !== 'undefined') {
        window.history.back();
      }
    },
    forward: () => {
      if (typeof window !== 'undefined') {
        window.history.forward();
      }
    },
    refresh: () => {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    },
    prefetch: () => {},
  };
}

export function useParams(): Record<string, string> {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const params: Record<string, string> = {};

    // Pattern: /drama/:slug/:seasonPart/:episodePart
    if (segments[0] === 'drama' && segments.length >= 4) {
      params.slug = segments[1];
      params.seasonPart = segments[2];
      params.episodePart = segments[3];
      return params;
    }

    // Pattern: /:type/:slug (or /drama/:slug, /movie/:slug, /article/:slug)
    if (segments.length >= 2) {
      params.type = segments[0];
      params.slug = segments[1];
      return params;
    }

    if (segments.length === 1) {
      params.slug = segments[0];
      return params;
    }

    return params;
  }
  return {};
}

export function useSearchParams() {
  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search);
  }
  return new URLSearchParams();
}

export function notFound() {
  throw new Error('NEXT_NOT_FOUND');
}
