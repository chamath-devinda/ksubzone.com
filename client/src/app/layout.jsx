import localFont from 'next/font/local';
import '@fontsource/inter/latin-300.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/outfit/latin-300.css';
import '@fontsource/outfit/latin-400.css';
import '@fontsource/outfit/latin-500.css';
import '@fontsource/outfit/latin-600.css';
import '@fontsource/outfit/latin-700.css';
import '@fontsource/outfit/latin-800.css';
import Providers from './Providers';
import dynamic from 'next/dynamic';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import '@/index.css';
import { SITE_URL } from '@/utils/seo';

const ParticleBackground = dynamic(() => import('@/components/layout/ParticleBackground'), { ssr: false });

const milker = localFont({
  src: '../../public/fonts/Milker.otf',
  variable: '--font-milker',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'KSubZone',
  title: 'KSubZone - Premium Korean Entertainment Platform',
  description: 'Watch the latest Korean dramas and movies with synchronized Sinhala and English subtitles. Discover, review, and enjoy premium K-entertainment.',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    siteName: 'KSubZone',
    type: 'website',
    locale: 'en_US',
  },
};

export default async function RootLayout({ children }) {
  const backendUrl = process.env.BACKEND_URL || (
    process.env.NODE_ENV === 'production'
      ? 'https://api.ksubzone.com'
      : 'http://127.0.0.1:5000'
  );
  let initialSiteContent = null;
  try {
    const res = await fetch(`${backendUrl}/api/site-content`, { next: { revalidate: 300 } });
    if (res.ok) {
      initialSiteContent = await res.json();
    }
  } catch (error) {
    console.error("Error fetching site content on root layout:", error);
  }

  return (
    <html lang="en" className={`dark ${milker.variable}`}>
      <body className="bg-[#030303] text-slate-100 font-sans selection:bg-brand-primary selection:text-white antialiased overflow-x-hidden">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-5YK4V61YQ6"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-5YK4V61YQ6');
          `}
        </Script>
        <Providers initialSiteContent={initialSiteContent}>
          <div className="flex flex-col min-h-screen bg-[#030303] text-slate-100 selection:bg-brand-primary selection:text-white relative">
            <ParticleBackground />
            <div className="relative z-10 flex flex-col min-h-screen bg-transparent">
              {children}
            </div>
          </div>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
