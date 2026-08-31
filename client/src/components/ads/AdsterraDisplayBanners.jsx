'use client';

function buildAdDocument({ key, width, height }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=${width}, initial-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: transparent; }
    </style>
  </head>
  <body>
    <script>
      atOptions = {
        key: '${key}',
        format: 'iframe',
        height: ${height},
        width: ${width},
        params: {}
      };
    </script>
    <script src="https://www.highrevenueformat.com/${key}/invoke.js"></script>
  </body>
</html>`;
}

function AdsterraDisplayFrame({ adKey, width, height, title, className = '' }) {
  const source = buildAdDocument({ key: adKey, width, height });

  return (
    <div className={`relative z-10 items-center justify-center ${className}`}>
      <iframe
        title={title}
        srcDoc={source}
        width={width}
        height={height}
        scrolling="no"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
        className="block border-0 bg-transparent"
      />
    </div>
  );
}

export function AdsterraLeaderboardBanner() {
  return (
    <AdsterraDisplayFrame
      adKey="8658915090686e956a2289c72ba73b71"
      width={468}
      height={60}
      title="Advertisement"
      className="hidden w-full py-3 sm:flex"
    />
  );
}

export function AdsterraRectangleBanner() {
  return (
    <AdsterraDisplayFrame
      adKey="586e1584081dab0775623a2b61895f68"
      width={300}
      height={250}
      title="Advertisement"
      className="flex w-full py-5"
    />
  );
}
