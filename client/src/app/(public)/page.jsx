import React from 'react';
import Home from '@/features/media/pages/Home';

export async function generateMetadata() {
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
  try {
    const res = await fetch(`${backendUrl}/api/site-content`, { next: { revalidate: 30 } });
    if (res.ok) {
      const data = await res.json();
      const seo = data.seo || {};
      const brand = data.brand || {};
      
      // Normalize primaryUrl to use www.ksubzone.com lowercase and https protocol
      let primaryUrl = brand.primaryUrl || 'https://www.ksubzone.com';
      primaryUrl = primaryUrl.trim().toLowerCase();
      if (primaryUrl.includes('ksubzone.com') && !primaryUrl.includes('www.ksubzone.com')) {
        primaryUrl = primaryUrl.replace('ksubzone.com', 'www.ksubzone.com');
      }
      if (!primaryUrl.startsWith('http://') && !primaryUrl.startsWith('https://')) {
        primaryUrl = 'https://' + primaryUrl;
      }

      return {
        title: seo.homeTitle || `${brand.siteName || 'KSubZone'} - ${brand.tagline || 'K-Drama & Movie Subtitles'}`,
        description: seo.homeDescription || 'Download synchronized Sinhala and English subtitles for Korean dramas and movies.',
        keywords: seo.keywords || 'ksubzone, k-drama subtitles, sinhala subtitles, korean movies',
        alternates: {
          canonical: primaryUrl,
        },
        openGraph: {
          title: seo.homeTitle || brand.siteName || 'KSubZone',
          description: seo.homeDescription,
          url: primaryUrl,
          siteName: brand.siteName || 'KSubZone',
          images: seo.ogImage ? [{ url: seo.ogImage }] : [],
          type: 'website',
        },
        twitter: {
          card: 'summary_large_image',
          title: seo.homeTitle || brand.siteName || 'KSubZone',
          description: seo.homeDescription,
          images: seo.ogImage ? [seo.ogImage] : [],
        },
      };
    }
  } catch (e) {
    console.error('Error generating home metadata:', e);
  }
  return {
    title: 'KSubZone - Sinhala & English K-Drama Subtitles',
    description: 'Download synchronized Sinhala and English SRT, VTT, and ASS community subtitles for Korean dramas and movies.',
  };
}

export default async function HomePage() {
  const backendUrl = process.env.BACKEND_URL || (
    process.env.NODE_ENV === 'production'
      ? 'https://api.ksubzone.com'
      : 'http://127.0.0.1:5000'
  );
  
  let initialHomeCatalog = {};
  let initialSubtitles = [];
  let initialLibraryMovies = { movies: [], totalPages: 1 };
  let initialLibraryDramas = { dramas: [], totalPages: 1 };
  
  try {
    const [catalogRes, subsRes, moviesRes, dramasRes] = await Promise.all([
      fetch(`${backendUrl}/api/media/home`, { next: { revalidate: 60 } }).then(r => r.ok ? r.json() : {}),
      fetch(`${backendUrl}/api/subtitles/recent?limit=4`, { next: { revalidate: 60 } }).then(r => r.ok ? r.json() : []),
      fetch(`${backendUrl}/api/media/movies?sort=popular&country=&limit=10`, { next: { revalidate: 60 } }).then(r => r.ok ? r.json() : { movies: [], totalPages: 1 }),
      fetch(`${backendUrl}/api/media/dramas?sort=popular&country=&limit=10`, { next: { revalidate: 60 } }).then(r => r.ok ? r.json() : { dramas: [], totalPages: 1 })
    ]);
    
    initialHomeCatalog = catalogRes;
    initialSubtitles = subsRes;
    initialLibraryMovies = moviesRes;
    initialLibraryDramas = dramasRes;
  } catch (error) {
    console.error("Error fetching homepage initial data on server:", error);
  }

  return (
    <Home 
      initialHomeCatalog={initialHomeCatalog} 
      initialSubtitles={initialSubtitles}
      initialLibraryMovies={initialLibraryMovies}
      initialLibraryDramas={initialLibraryDramas}
    />
  );
}
