import React, { useEffect } from 'react';

/**
 * SeoTags Component
 * Dynamically injects SEO Meta Title, Description, Keywords, Canonical link, 
 * Open Graph, Twitter Cards, and JSON-LD schema markups into the document head.
 */
export default function SeoTags({ 
  title, 
  description, 
  keywords = [], 
  canonical, 
  image, 
  type = 'video.movie', 
  schemaMarkup 
}) {
  
  useEffect(() => {
    // Skip client-side DOM overrides if standard Next.js routing is active
    if (typeof window !== 'undefined' && document.querySelector('script[src*="/_next/"]')) {
      return;
    }

    // 1. Update Title
    if (title) {
      document.title = title;
    }

    const head = document.head;

    // Helper to upsert meta tags
    const upsertMeta = (nameAttr, nameVal, content) => {
      if (!content) return;
      let el = head.querySelector(`meta[${nameAttr}="${nameVal}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(nameAttr, nameVal);
        head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Helper to upsert link tags
    const upsertLink = (rel, href) => {
      if (!href) return;
      let el = head.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // 2. Standard Meta Tags
    upsertMeta('name', 'description', description || 'Watch movies and K-dramas with synchronized multi-language subtitles.');
    upsertMeta('name', 'keywords', keywords.length > 0 ? keywords.join(', ') : 'kdramas, korean entertainment, subtitles, srt, vtt');
    upsertMeta('name', 'robots', 'index, follow');

    // 3. Canonical URL
    let fallbackCanonical = '';
    if (typeof window !== 'undefined') {
      fallbackCanonical = 'https://www.ksubzone.com' + window.location.pathname + window.location.search + window.location.hash;
    }
    upsertLink('canonical', canonical || fallbackCanonical);

    // 4. Open Graph Meta Tags
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', canonical || fallbackCanonical);
    if (image) {
      upsertMeta('property', 'og:image', image);
    }

    // 5. Twitter Card Meta Tags
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    if (image) {
      upsertMeta('name', 'twitter:image', image);
    }

    // 6. JSON-LD Schema Script Markup
    let schemaScript = head.querySelector('script[id="ksubzone-jsonld-schema"]');
    if (schemaMarkup) {
      if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.setAttribute('type', 'application/ld+json');
        schemaScript.setAttribute('id', 'ksubzone-jsonld-schema');
        head.appendChild(schemaScript);
      }
      schemaScript.textContent = JSON.stringify(schemaMarkup);
    } else {
      if (schemaScript) {
        head.removeChild(schemaScript);
      }
    }

    // Clean up schema on unmount to prevent duplicate index scripts
    return () => {
      const cleanupScript = head.querySelector('script[id="ksubzone-jsonld-schema"]');
      if (cleanupScript) {
        head.removeChild(cleanupScript);
      }
    };

  }, [title, description, keywords, canonical, image, type, schemaMarkup]);

  return null; // Renderless component
}
