'use client';

import Script from 'next/script';

const CONTAINER_ID = 'container-90963118e211fbe13565d79b0d81a39d';

export default function AdsterraNativeBanner() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-[1280px] px-3 sm:px-6 lg:px-8">
      <Script
        id="adsterra-native-banner"
        async
        data-cfasync="false"
        src="https://pl31115664.profitableratecpmnetwork.com/90963118e211fbe13565d79b0d81a39d/invoke.js"
        strategy="afterInteractive"
      />
      <div id={CONTAINER_ID} className="min-h-[90px] w-full" />
    </div>
  );
}
