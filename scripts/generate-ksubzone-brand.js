const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'ksubzone-brand-identity');

const colors = {
  ink: '#070711',
  charcoal: '#12131C',
  slate: '#2A2D3A',
  mist: '#F7F8FC',
  white: '#FFFFFF',
  purple: '#8B5CF6',
  blue: '#1D4ED8',
  cyan: '#00D5FF',
  pink: '#FF3D9A',
};

const directories = [
  '01-logo/svg',
  '01-logo/png',
  '01-logo/print',
  '02-icons/favicon',
  '02-icons/app-icon',
  '03-social',
  '04-guidelines',
  '05-preview-sheets',
  'legacy/logo',
  'legacy/favicons',
  'legacy/social',
  'exports',
];

function ensureDirs() {
  if (fs.existsSync(out)) fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const dir of directories) fs.mkdirSync(path.join(out, dir), { recursive: true });
}

function writeFile(rel, data, encoding = 'utf8') {
  fs.writeFileSync(path.join(out, rel), data, encoding);
}

function inner(svg) {
  return svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

function kszSymbol({ fill = 'gradient', id = 'ksz', background = 'none', shadow = false } = {}) {
  const symbolFill = fill === 'gradient' ? `url(#${id}-gradient)` : fill;
  const bg = background === 'none'
    ? ''
    : `<rect x="3" y="3" width="90" height="90" rx="22" fill="${background}"/>`;
  const filter = shadow ? `filter="url(#${id}-shadow)"` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-labelledby="${id}-title ${id}-desc">
  <title id="${id}-title">Ksubzone KSZ symbol</title>
  <desc id="${id}-desc">A bold geometric K monogram with S and Z hidden in a stepped negative-space channel.</desc>
  <defs>
    <linearGradient id="${id}-gradient" x1="10" y1="88" x2="88" y2="8" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${colors.blue}"/>
      <stop offset="0.48" stop-color="${colors.purple}"/>
      <stop offset="1" stop-color="${colors.cyan}"/>
    </linearGradient>
    <filter id="${id}-shadow" x="-18%" y="-18%" width="136%" height="136%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#1D4ED8" flood-opacity="0.2"/>
    </filter>
    <mask id="${id}-ksz-cut" maskUnits="userSpaceOnUse">
      <rect width="96" height="96" fill="#fff"/>
      <path d="M48 24H78L68 35H56L49 43H76V53H54L46 62H77L86 72H49L36 56L44 48L36 41Z" fill="#000"/>
    </mask>
  </defs>
  ${bg}
  <g ${filter} mask="url(#${id}-ksz-cut)">
    <path fill="${symbolFill}" d="M12 10H34V86H12Z"/>
    <path fill="${symbolFill}" d="M34 42L64 10H91L55 48Z"/>
    <path fill="${symbolFill}" d="M34 54L55 48L91 86H64Z"/>
  </g>
</svg>`;
}

function faviconSymbol({ id = 'favicon' } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-labelledby="${id}-title">
  <title id="${id}-title">Ksubzone favicon</title>
  <defs>
    <linearGradient id="${id}-bg" x1="0" y1="96" x2="96" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${colors.ink}"/>
      <stop offset="0.48" stop-color="${colors.purple}"/>
      <stop offset="1" stop-color="${colors.cyan}"/>
    </linearGradient>
  </defs>
  <rect width="96" height="96" rx="23" fill="url(#${id}-bg)"/>
  <svg x="19" y="15" width="58" height="66" viewBox="0 0 96 96">${inner(kszSymbol({ fill: colors.white, id: `${id}-mark` }))}</svg>
</svg>`;
}

function appIconSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-labelledby="app-title">
  <title id="app-title">Ksubzone app icon</title>
  <defs>
    <radialGradient id="app-glow" cx="74%" cy="18%" r="92%">
      <stop offset="0" stop-color="${colors.cyan}"/>
      <stop offset="0.38" stop-color="${colors.purple}"/>
      <stop offset="1" stop-color="${colors.ink}"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" rx="224" fill="url(#app-glow)"/>
  <rect x="72" y="72" width="880" height="880" rx="180" fill="#fff" opacity="0.08"/>
  <svg x="245" y="212" width="534" height="600" viewBox="0 0 96 96">${inner(kszSymbol({ fill: colors.white, id: 'app-mark', shadow: true }))}</svg>
</svg>`;
}

function wordmarkSvg({ fill = colors.ink, id = 'wordmark' } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 128" role="img" aria-labelledby="${id}-title">
  <title id="${id}-title">Ksubzone.com wordmark</title>
  <style>
    .brand { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 78px; font-weight: 820; letter-spacing: -1.4px; }
    .domain { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 48px; font-weight: 760; letter-spacing: -0.4px; }
  </style>
  <text x="0" y="86" class="brand" fill="${fill}">Ksubzone</text>
  <text x="404" y="86" class="domain" fill="${fill}" opacity="0.58">.com</text>
</svg>`;
}

function horizontalLogo({ dark = false, id = 'horizontal' } = {}) {
  const bg = dark ? colors.ink : colors.white;
  const text = dark ? colors.white : colors.ink;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 220" role="img" aria-labelledby="${id}-title">
  <title id="${id}-title">Ksubzone.com horizontal logo</title>
  <rect width="900" height="220" fill="${bg}"/>
  <svg x="58" y="48" width="124" height="124" viewBox="0 0 96 96">${inner(kszSymbol({ id: `${id}-symbol`, shadow: true }))}</svg>
  <svg x="224" y="54" width="590" height="105" viewBox="0 0 720 128">${inner(wordmarkSvg({ fill: text, id: `${id}-word` }))}</svg>
</svg>`;
}

function verticalLogo({ dark = false, id = 'vertical' } = {}) {
  const bg = dark ? colors.ink : colors.white;
  const text = dark ? colors.white : colors.ink;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 520" role="img" aria-labelledby="${id}-title">
  <title id="${id}-title">Ksubzone.com vertical logo</title>
  <rect width="520" height="520" fill="${bg}"/>
  <svg x="170" y="76" width="180" height="180" viewBox="0 0 96 96">${inner(kszSymbol({ id: `${id}-symbol`, shadow: true }))}</svg>
  <svg x="74" y="296" width="372" height="66" viewBox="0 0 720 128">${inner(wordmarkSvg({ fill: text, id: `${id}-word` }))}</svg>
  <text x="260" y="408" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="760" fill="${dark ? '#A8B0C3' : '#687084'}" letter-spacing="3.6">KOREAN ENTERTAINMENT SUBTITLES</text>
</svg>`;
}

function paletteJson() {
  return JSON.stringify({
    brand: 'Ksubzone.com',
    palette: [
      { name: 'Electric Purple', hex: colors.purple, role: 'Primary gradient core' },
      { name: 'Neon Blue', hex: colors.blue, role: 'Primary gradient base' },
      { name: 'Digital Cyan', hex: colors.cyan, role: 'Primary gradient highlight' },
      { name: 'Midnight Black', hex: colors.ink, role: 'Dark background and wordmark' },
      { name: 'Dark Charcoal', hex: colors.charcoal, role: 'Panels and UI surfaces' },
      { name: 'Cloud White', hex: colors.mist, role: 'Light background' },
      { name: 'Pulse Pink', hex: colors.pink, role: 'Optional entertainment accent' },
    ],
    gradient: `linear-gradient(135deg, ${colors.blue} 0%, ${colors.purple} 48%, ${colors.cyan} 100%)`,
  }, null, 2);
}

function epsSymbol() {
  return `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 96 96
%%Title: Ksubzone KSZ Symbol Monochrome
%%Creator: Codex
%%EndComments
/c { closepath fill } bind def
0.027 0.027 0.067 setrgbcolor
newpath 12 10 moveto 34 10 lineto 34 86 lineto 12 86 lineto c
newpath 34 42 moveto 64 10 lineto 91 10 lineto 55 48 lineto c
newpath 34 54 moveto 55 48 lineto 91 86 lineto 64 86 lineto c
1 1 1 setrgbcolor
newpath 48 24 moveto 78 24 lineto 68 35 lineto 56 35 lineto 49 43 lineto 76 43 lineto 76 53 lineto 54 53 lineto 46 62 lineto 77 62 lineto 86 72 lineto 49 72 lineto 36 56 lineto 44 48 lineto 36 41 lineto c
showpage
%%EOF`;
}

function socialProfileSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200">
  <defs>
    <radialGradient id="social-bg" cx="72%" cy="18%" r="92%">
      <stop offset="0" stop-color="${colors.cyan}"/>
      <stop offset="0.38" stop-color="${colors.purple}"/>
      <stop offset="1" stop-color="${colors.ink}"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="1200" rx="260" fill="url(#social-bg)"/>
  <rect x="88" y="88" width="1024" height="1024" rx="210" fill="#fff" opacity="0.08"/>
  <svg x="285" y="248" width="630" height="704" viewBox="0 0 96 96">${inner(kszSymbol({ fill: colors.white, id: 'social-mark', shadow: true }))}</svg>
</svg>`;
}

function socialBannerSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 500">
  <defs>
    <linearGradient id="banner-bg" x1="0" y1="500" x2="1500" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${colors.ink}"/>
      <stop offset="0.45" stop-color="${colors.charcoal}"/>
      <stop offset="0.72" stop-color="${colors.blue}"/>
      <stop offset="1" stop-color="${colors.cyan}"/>
    </linearGradient>
  </defs>
  <rect width="1500" height="500" fill="url(#banner-bg)"/>
  <path d="M0 390C220 322 383 430 584 356C788 281 886 104 1150 143C1284 163 1386 238 1500 188V500H0Z" fill="#fff" opacity="0.055"/>
  <path d="M984 0H1500V500H782Z" fill="#fff" opacity="0.07"/>
  <svg x="116" y="115" width="168" height="168" viewBox="0 0 96 96">${inner(kszSymbol({ fill: colors.white, id: 'banner-symbol' }))}</svg>
  <text x="332" y="214" font-family="Inter, Arial, sans-serif" font-size="82" font-weight="840" fill="#fff" letter-spacing="-2">Ksubzone<tspan opacity="0.7" font-size="52">.com</tspan></text>
  <rect x="335" y="258" width="430" height="4" rx="2" fill="${colors.cyan}"/>
  <text x="332" y="318" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="720" fill="#F7F8FC" letter-spacing="4">KOREAN ENTERTAINMENT SUBTITLES</text>
</svg>`;
}

function previewSheetSvg({ dark = false } = {}) {
  const bg = dark ? colors.ink : colors.white;
  const fg = dark ? colors.white : colors.ink;
  const muted = dark ? '#A8B0C3' : '#687084';
  const panel = dark ? colors.charcoal : colors.mist;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000">
  <rect width="1600" height="1000" fill="${bg}"/>
  <text x="86" y="112" font-family="Inter, Arial, sans-serif" font-size="52" font-weight="850" fill="${fg}" letter-spacing="-1.5">Ksubzone.com Brand Identity</text>
  <text x="88" y="158" font-family="Inter, Arial, sans-serif" font-size="21" font-weight="620" fill="${muted}">Geometric KSZ monogram system for a Korean entertainment and subtitle platform</text>
  <rect x="84" y="220" width="620" height="320" rx="20" fill="${panel}"/>
  <svg x="160" y="282" width="196" height="196" viewBox="0 0 96 96">${inner(kszSymbol({ id: `sheet-${dark ? 'dark' : 'light'}-mark`, shadow: true }))}</svg>
  <svg x="398" y="330" width="250" height="46" viewBox="0 0 720 128">${inner(wordmarkSvg({ fill: fg, id: `sheet-${dark ? 'dark' : 'light'}-word` }))}</svg>
  <text x="398" y="418" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" fill="${muted}" letter-spacing="2.5">MAIN LOGO</text>
  <rect x="752" y="220" width="360" height="320" rx="20" fill="${panel}"/>
  <svg x="852" y="278" width="160" height="160" viewBox="0 0 96 96">${inner(kszSymbol({ fill: fg, id: `sheet-${dark ? 'dark' : 'light'}-mono` }))}</svg>
  <text x="932" y="474" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" fill="${muted}" letter-spacing="2.5">MONO SYMBOL</text>
  <rect x="1160" y="220" width="280" height="320" rx="54" fill="url(#app-bg)"/>
  <svg x="1232" y="286" width="136" height="152" viewBox="0 0 96 96">${inner(kszSymbol({ fill: colors.white, id: `sheet-${dark ? 'dark' : 'light'}-app` }))}</svg>
  <text x="1300" y="474" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" fill="#fff" opacity="0.78" letter-spacing="2.5">APP ICON</text>
  <defs>
    <linearGradient id="app-bg" x1="0" y1="320" x2="280" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${colors.ink}"/>
      <stop offset="0.46" stop-color="${colors.purple}"/>
      <stop offset="1" stop-color="${colors.cyan}"/>
    </linearGradient>
  </defs>
  <rect x="84" y="620" width="1356" height="168" rx="20" fill="${panel}"/>
  <svg x="120" y="654" width="172" height="100" viewBox="0 0 900 220">${inner(horizontalLogo({ dark, id: `sheet-${dark ? 'dark' : 'light'}-horizontal` }))}</svg>
  <rect x="354" y="664" width="210" height="22" rx="11" fill="${muted}" opacity="0.32"/>
  <rect x="354" y="705" width="360" height="18" rx="9" fill="${muted}" opacity="0.22"/>
  <rect x="354" y="737" width="250" height="18" rx="9" fill="${muted}" opacity="0.18"/>
  <circle cx="1248" cy="704" r="48" fill="${colors.purple}"/>
  <circle cx="1328" cy="704" r="48" fill="${colors.blue}"/>
  <circle cx="1408" cy="704" r="48" fill="${colors.cyan}"/>
  <text x="88" y="890" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="820" fill="${fg}">Personality</text>
  <text x="88" y="930" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="620" fill="${muted}">Bold / youthful / global / premium / community-driven / digital-first</text>
</svg>`;
}

function indexHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ksubzone.com Brand Guidelines Preview</title>
  <style>
    :root { --ink:${colors.ink}; --charcoal:${colors.charcoal}; --muted:#687084; --line:#E4E7EF; --mist:${colors.mist}; --purple:${colors.purple}; --blue:${colors.blue}; --cyan:${colors.cyan}; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color:var(--ink); background:#fff; }
    header { padding:24px 44px; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; gap:24px; position:sticky; top:0; background:rgba(255,255,255,.94); backdrop-filter:blur(16px); }
    .brand { display:flex; align-items:center; gap:14px; font-weight:850; font-size:21px; letter-spacing:-.3px; }
    .brand img { width:38px; height:38px; }
    nav { display:flex; gap:18px; flex-wrap:wrap; }
    nav a { color:var(--muted); text-decoration:none; font-weight:700; font-size:14px; }
    main { max-width:1180px; margin:0 auto; padding:64px 28px 88px; }
    .hero { min-height:420px; display:grid; grid-template-columns:minmax(0,1fr) 430px; gap:52px; align-items:center; border-bottom:1px solid var(--line); }
    h1 { font-size:clamp(48px,7vw,92px); line-height:.92; letter-spacing:-.055em; margin:0; }
    .lead { font-size:20px; line-height:1.6; color:var(--muted); max-width:620px; margin:24px 0 0; }
    .hero-card { min-height:330px; border-radius:8px; background:var(--mist); display:grid; place-items:center; border:1px solid var(--line); }
    .hero-card img { width:250px; height:auto; }
    section { padding-top:58px; }
    h2 { font-size:30px; margin:0 0 22px; letter-spacing:-.03em; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:18px; }
    .tile { border:1px solid var(--line); border-radius:8px; overflow:hidden; background:#fff; }
    .preview { min-height:210px; display:grid; place-items:center; padding:28px; background:var(--mist); }
    .preview.dark { background:var(--ink); }
    .preview img { max-width:86%; max-height:150px; }
    .caption { padding:15px 16px; color:var(--muted); font-size:14px; font-weight:650; border-top:1px solid var(--line); }
    .swatch { height:120px; }
    .meta { padding:15px 16px; color:var(--muted); font-size:14px; line-height:1.45; }
    .meta strong { display:block; color:var(--ink); margin-bottom:3px; }
    table { width:100%; border-collapse:collapse; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
    th,td { padding:15px 16px; border-bottom:1px solid var(--line); text-align:left; font-size:14px; }
    th { background:var(--mist); color:var(--muted); }
    td a { color:var(--blue); font-weight:800; text-decoration:none; }
    tr:last-child td { border-bottom:0; }
    @media(max-width:860px){ header{align-items:flex-start; flex-direction:column; padding:20px 24px;} .hero{grid-template-columns:1fr;} table{display:block; overflow:auto;} }
  </style>
</head>
<body>
  <header>
    <div class="brand"><img src="01-logo/svg/symbol-full-color.svg" alt="">Ksubzone.com</div>
    <nav><a href="#logos">Logos</a><a href="#colors">Colors</a><a href="#type">Typography</a><a href="#mockups">Mockups</a><a href="#files">Files</a></nav>
  </header>
  <main>
    <div class="hero">
      <div>
        <h1>Modern KSZ identity for global Korean entertainment.</h1>
        <p class="lead">A K-first geometric monogram with S and Z embedded through negative space. Built for Gen Z audiences, subtitle culture, mobile interfaces, and high-recall digital branding.</p>
      </div>
      <div class="hero-card"><img src="01-logo/svg/symbol-full-color.svg" alt="Ksubzone KSZ mark"></div>
    </div>
    <section id="logos">
      <h2>Logo System</h2>
      <div class="grid">
        <div class="tile"><div class="preview"><img src="01-logo/svg/symbol-full-color.svg" alt=""></div><div class="caption">Full-color symbol</div></div>
        <div class="tile"><div class="preview"><img src="01-logo/svg/logo-horizontal.svg" alt=""></div><div class="caption">Horizontal logo</div></div>
        <div class="tile"><div class="preview"><img src="01-logo/svg/logo-vertical.svg" alt=""></div><div class="caption">Vertical logo</div></div>
        <div class="tile"><div class="preview"><img src="01-logo/svg/symbol-black.svg" alt=""></div><div class="caption">Black monochrome</div></div>
        <div class="tile"><div class="preview dark"><img src="01-logo/svg/symbol-white.svg" alt=""></div><div class="caption">White monochrome</div></div>
        <div class="tile"><div class="preview"><img src="01-logo/svg/wordmark.svg" alt=""></div><div class="caption">Wordmark</div></div>
      </div>
    </section>
    <section id="colors">
      <h2>Color Palette</h2>
      <div class="grid">
        <div class="tile"><div class="swatch" style="background:linear-gradient(135deg,${colors.blue},${colors.purple},${colors.cyan})"></div><div class="meta"><strong>Brand Gradient</strong>${colors.blue} / ${colors.purple} / ${colors.cyan}</div></div>
        <div class="tile"><div class="swatch" style="background:${colors.ink}"></div><div class="meta"><strong>Midnight Black</strong>${colors.ink}</div></div>
        <div class="tile"><div class="swatch" style="background:${colors.pink}"></div><div class="meta"><strong>Pulse Pink</strong>${colors.pink}</div></div>
        <div class="tile"><div class="swatch" style="background:${colors.mist}"></div><div class="meta"><strong>Cloud White</strong>${colors.mist}</div></div>
      </div>
    </section>
    <section id="type">
      <h2>Typography</h2>
      <div class="grid">
        <div class="tile"><div class="meta"><strong>Primary: Inter</strong>Product UI, logo lockups, headings, navigation, and platform copy.</div></div>
        <div class="tile"><div class="meta"><strong>Alternative: Satoshi / Manrope</strong>Use if a more editorial or startup-native tone is needed.</div></div>
        <div class="tile"><div class="meta"><strong>Korean Support</strong>Pretendard or Noto Sans KR for Hangul interface text and subtitles.</div></div>
      </div>
    </section>
    <section id="mockups">
      <h2>Brand Preview Sheets</h2>
      <div class="grid">
        <div class="tile"><div class="preview"><img src="05-preview-sheets/brand-showcase-light.png" alt=""></div><div class="caption">Light background showcase</div></div>
        <div class="tile"><div class="preview dark"><img src="05-preview-sheets/brand-showcase-dark.png" alt=""></div><div class="caption">Dark background showcase</div></div>
        <div class="tile"><div class="preview"><img src="03-social/social-profile.png" alt=""></div><div class="caption">Social profile preview</div></div>
      </div>
    </section>
    <section id="files">
      <h2>Export-Ready Assets</h2>
      <table>
        <thead><tr><th>Deliverable</th><th>Formats</th><th>Folder</th></tr></thead>
        <tbody>
          <tr><td>Main logo and symbol</td><td>SVG, PNG, EPS, PDF-ready</td><td><a href="01-logo/svg/logo-horizontal.svg">01-logo</a></td></tr>
          <tr><td>Favicons</td><td>SVG, PNG, ICO</td><td><a href="02-icons/favicon/favicon.svg">02-icons/favicon</a></td></tr>
          <tr><td>App icon</td><td>SVG, PNG</td><td><a href="02-icons/app-icon/app-icon.svg">02-icons/app-icon</a></td></tr>
          <tr><td>Social assets</td><td>SVG, PNG</td><td><a href="03-social/social-profile.png">03-social</a></td></tr>
          <tr><td>Guidelines</td><td>HTML, JSON, Markdown</td><td><a href="04-guidelines/typography-guide.md">04-guidelines</a></td></tr>
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
}

function typographyGuide() {
  return `# Typography Recommendations

## Primary Latin UI Typeface

Inter is recommended for the Ksubzone.com product interface, logo lockups, navigation, buttons, metadata, and subtitle platform UI. It feels modern, global, neutral, and highly readable on mobile screens.

## Premium Alternatives

- Satoshi: stronger startup/editorial personality.
- Manrope: rounded and youthful while staying professional.
- Space Grotesk: useful for campaign headlines, not body UI.

## Korean / Hangul Support

- Pretendard: best match for Korean digital product interfaces.
- Noto Sans KR: reliable fallback for broad compatibility.

## Suggested Pairing

- Brand / UI: Inter 700-850
- Body: Inter 400-550
- Korean text: Pretendard 400-700
- Technical labels: JetBrains Mono or IBM Plex Mono
`;
}

function brandReadme() {
  return `# Ksubzone.com Brand Identity Package

This ZIP contains a complete vector-first brand identity system for Ksubzone.com, a modern Korean entertainment and subtitle platform.

## Concept

The logo is a K-first geometric monogram. The K is instantly readable at small sizes, while a stepped negative-space channel suggests S and Z. The result is bold, digital, youthful, and scalable without relying on Korean entertainment clichés.

## Package Structure

- 01-logo: main logo, symbol, wordmark, horizontal and vertical lockups.
- 02-icons: favicon and app icon exports.
- 03-social: social profile and banner assets.
- 04-guidelines: colors, typography, and usage notes.
- 05-preview-sheets: professional light and dark brand showcase sheets.
- legacy: compatibility filenames from the previous package.

## Usage

Use the full-color gradient mark on white or very light backgrounds. Use the white mark on dark backgrounds. Use the black mark for print, embossing, single-color reproduction, and legal/partner usage.

## Technical Notes

SVG files are the source-of-truth vectors. EPS is provided as a monochrome print-compatible symbol. PDF-ready preview sheets can be generated from the SVG/HTML assets and all SVGs are compatible with Illustrator, Figma, Affinity Designer, Canva upload, and web use.
`;
}

async function pngFromSvg(browser, svg, rel, width, height = width, transparent = true) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const data = Buffer.from(svg).toString('base64');
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;width:${width}px;height:${height}px;overflow:hidden;background:${transparent ? 'transparent' : '#fff'}"><img alt="" src="data:image/svg+xml;base64,${data}" style="display:block;width:${width}px;height:${height}px;object-fit:contain"></body></html>`, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(out, rel), omitBackground: transparent });
  await page.close();
}

async function pdfFromSvg(browser, svg, rel, widthPx = 1600, heightPx = 1000) {
  const page = await browser.newPage({ viewport: { width: widthPx, height: heightPx }, deviceScaleFactor: 1 });
  const data = Buffer.from(svg).toString('base64');
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${widthPx}px ${heightPx}px;margin:0}body{margin:0}</style></head><body><img alt="" src="data:image/svg+xml;base64,${data}" style="display:block;width:${widthPx}px;height:${heightPx}px"></body></html>`, { waitUntil: 'load' });
  await page.pdf({ path: path.join(out, rel), width: `${widthPx}px`, height: `${heightPx}px`, printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
  await page.close();
}

async function icoFromPngs() {
  const png16 = fs.readFileSync(path.join(out, '02-icons/favicon/favicon-16x16.png'));
  const png32 = fs.readFileSync(path.join(out, '02-icons/favicon/favicon-32x32.png'));
  const entries = [{ size: 16, data: png16 }, { size: 32, data: png32 }];
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  for (const [index, entry] of entries.entries()) {
    const base = index * 16;
    dir.writeUInt8(entry.size, base);
    dir.writeUInt8(entry.size, base + 1);
    dir.writeUInt8(0, base + 2);
    dir.writeUInt8(0, base + 3);
    dir.writeUInt16LE(1, base + 4);
    dir.writeUInt16LE(32, base + 6);
    dir.writeUInt32LE(entry.data.length, base + 8);
    dir.writeUInt32LE(offset, base + 12);
    offset += entry.data.length;
  }
  const ico = Buffer.concat([header, dir, ...entries.map((entry) => entry.data)]);
  writeFile('02-icons/favicon/favicon.ico', ico, undefined);
  writeFile('legacy/favicons/favicon.ico', ico, undefined);
}

async function zipPackage() {
  const zip = path.join(root, 'ksubzone-brand-identity.zip');
  if (fs.existsSync(zip)) fs.unlinkSync(zip);
  const { spawnSync } = require('child_process');
  const command = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${out}', '${zip}', [System.IO.Compression.CompressionLevel]::Optimal, $false)`;
  const result = spawnSync('powershell', ['-NoProfile', '-Command', command], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Failed to create ZIP archive');
}

async function main() {
  ensureDirs();

  const symbol = kszSymbol({ id: 'symbol', shadow: true });
  const symbolBlack = kszSymbol({ fill: colors.ink, id: 'symbol-black' });
  const symbolWhite = kszSymbol({ fill: colors.white, id: 'symbol-white' });
  const wordmark = wordmarkSvg();
  const horizontal = horizontalLogo({ id: 'logo-horizontal' });
  const horizontalDark = horizontalLogo({ dark: true, id: 'logo-horizontal-dark' });
  const vertical = verticalLogo({ id: 'logo-vertical' });
  const verticalDark = verticalLogo({ dark: true, id: 'logo-vertical-dark' });
  const favicon = faviconSymbol();
  const appIcon = appIconSvg();
  const socialProfile = socialProfileSvg();
  const socialBanner = socialBannerSvg();
  const previewLight = previewSheetSvg({ dark: false });
  const previewDark = previewSheetSvg({ dark: true });

  writeFile('01-logo/svg/symbol-full-color.svg', symbol);
  writeFile('01-logo/svg/symbol-black.svg', symbolBlack);
  writeFile('01-logo/svg/symbol-white.svg', symbolWhite);
  writeFile('01-logo/svg/wordmark.svg', wordmark);
  writeFile('01-logo/svg/logo-horizontal.svg', horizontal);
  writeFile('01-logo/svg/logo-horizontal-dark.svg', horizontalDark);
  writeFile('01-logo/svg/logo-vertical.svg', vertical);
  writeFile('01-logo/svg/logo-vertical-dark.svg', verticalDark);
  writeFile('01-logo/print/symbol-monochrome.eps', epsSymbol());
  writeFile('02-icons/favicon/favicon.svg', favicon);
  writeFile('02-icons/app-icon/app-icon.svg', appIcon);
  writeFile('03-social/social-profile.svg', socialProfile);
  writeFile('03-social/social-banner.svg', socialBanner);
  writeFile('04-guidelines/color-palette.json', paletteJson());
  writeFile('04-guidelines/typography-guide.md', typographyGuide());
  writeFile('04-guidelines/brand-guidelines-preview.html', indexHtml());
  writeFile('05-preview-sheets/brand-showcase-light.svg', previewLight);
  writeFile('05-preview-sheets/brand-showcase-dark.svg', previewDark);
  writeFile('README.md', brandReadme());
  writeFile('index.html', indexHtml());

  // Legacy filenames for easy replacement in the existing project.
  writeFile('legacy/logo/symbol.svg', symbol);
  writeFile('legacy/logo/symbol-black.svg', symbolBlack);
  writeFile('legacy/logo/symbol-white.svg', symbolWhite);
  writeFile('legacy/logo/wordmark.svg', wordmark);
  writeFile('legacy/logo/logo-horizontal.svg', horizontal);
  writeFile('legacy/logo/logo-stacked.svg', vertical);
  writeFile('legacy/favicons/favicon.svg', favicon);
  writeFile('legacy/social/social-profile.svg', socialProfile);
  writeFile('legacy/social/social-banner.svg', socialBanner);

  const browserPath = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].find((candidate) => fs.existsSync(candidate));
  const browser = await chromium.launch(browserPath ? { executablePath: browserPath } : undefined);
  try {
    await pngFromSvg(browser, symbol, '01-logo/png/symbol-full-color-1024.png', 1024);
    await pngFromSvg(browser, symbolBlack, '01-logo/png/symbol-black-1024.png', 1024);
    await pngFromSvg(browser, symbolWhite, '01-logo/png/symbol-white-1024.png', 1024);
    await pngFromSvg(browser, horizontal, '01-logo/png/logo-horizontal-2400.png', 2400, 587, false);
    await pngFromSvg(browser, vertical, '01-logo/png/logo-vertical-1600.png', 1600, 1600, false);
    await pngFromSvg(browser, favicon, '02-icons/favicon/favicon-16x16.png', 16, 16, false);
    await pngFromSvg(browser, favicon, '02-icons/favicon/favicon-32x32.png', 32, 32, false);
    await pngFromSvg(browser, favicon, '02-icons/favicon/favicon-48x48.png', 48, 48, false);
    await pngFromSvg(browser, favicon, '02-icons/favicon/apple-touch-icon.png', 180, 180, false);
    await pngFromSvg(browser, appIcon, '02-icons/app-icon/app-icon-1024.png', 1024, 1024, false);
    await pngFromSvg(browser, socialProfile, '03-social/social-profile.png', 1200, 1200, false);
    await pngFromSvg(browser, socialBanner, '03-social/social-banner.png', 1500, 500, false);
    await pngFromSvg(browser, previewLight, '05-preview-sheets/brand-showcase-light.png', 1600, 1000, false);
    await pngFromSvg(browser, previewDark, '05-preview-sheets/brand-showcase-dark.png', 1600, 1000, false);
    await pdfFromSvg(browser, symbol, '01-logo/print/symbol-full-color.pdf', 1024, 1024);
    await pdfFromSvg(browser, horizontal, '01-logo/print/logo-horizontal.pdf', 2400, 587);
    await pdfFromSvg(browser, previewLight, '05-preview-sheets/brand-showcase-light.pdf');
    await pdfFromSvg(browser, previewDark, '05-preview-sheets/brand-showcase-dark.pdf');

    // Legacy raster exports.
    await pngFromSvg(browser, horizontal, 'exports/logo-horizontal-1600.png', 1600, 391, false);
    await pngFromSvg(browser, vertical, 'exports/logo-stacked-1200.png', 1200, 1200, false);
    await pngFromSvg(browser, symbol, 'exports/symbol-512.png', 512);
    await pngFromSvg(browser, socialProfile, 'legacy/social/profile.png', 400, 400, false);
    await pngFromSvg(browser, socialBanner, 'legacy/social/banner.png', 1500, 500, false);
    await pngFromSvg(browser, favicon, 'legacy/favicons/favicon-16x16.png', 16, 16, false);
    await pngFromSvg(browser, favicon, 'legacy/favicons/favicon-32x32.png', 32, 32, false);
    await pngFromSvg(browser, favicon, 'legacy/favicons/apple-touch-icon.png', 180, 180, false);
  } finally {
    await browser.close();
  }

  await icoFromPngs();
  await zipPackage();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
