const baseUrl = (process.env.SEO_BASE_URL || 'http://127.0.0.1:5173').replace(/\/+$/, '');
const maxUrls = Number(process.env.SEO_MAX_URLS || 0);
const googlebot = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const decodeXml = (value) => value
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'");

const normalizeUrl = (value) => value.replace(/\/+$/, '') || value;
const errors = [];

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': googlebot, Accept: 'text/html,application/xml,text/plain' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  });
  return { response, body: await response.text() };
}

const sitemapResult = await fetchText(`${baseUrl}/sitemap.xml`);
const sitemapType = sitemapResult.response.headers.get('content-type') || '';
if (sitemapResult.response.status !== 200) errors.push(`sitemap.xml returned ${sitemapResult.response.status}`);
if (!/^application\/xml;\s*charset=utf-8/i.test(sitemapType)) {
  errors.push(`sitemap.xml has incorrect Content-Type: ${sitemapType || '(missing)'}`);
}

let urls = [...sitemapResult.body.matchAll(/<loc>(.*?)<\/loc>/gsi)]
  .map((match) => decodeXml(match[1].trim()));
if (maxUrls > 0) urls = urls.slice(0, maxUrls);
if (urls.length === 0) errors.push('sitemap.xml contains no URLs');
if (new Set(urls).size !== urls.length) errors.push('sitemap.xml contains duplicate URLs');

const robotsResult = await fetchText(`${baseUrl}/robots.txt`);
const robotsType = robotsResult.response.headers.get('content-type') || '';
if (robotsResult.response.status !== 200) errors.push(`robots.txt returned ${robotsResult.response.status}`);
if (!/^text\/plain;\s*charset=utf-8/i.test(robotsType)) {
  errors.push(`robots.txt has incorrect Content-Type: ${robotsType || '(missing)'}`);
}
if (!/^Sitemap:\s+https:\/\/www\.ksubzone\.com\/sitemap\.xml\s*$/im.test(robotsResult.body)) {
  errors.push('robots.txt does not advertise the canonical sitemap URL');
}

let cursor = 0;
const workers = Array.from({ length: Math.min(6, urls.length) }, async () => {
  while (cursor < urls.length) {
    const index = cursor;
    cursor += 1;
    const canonicalUrl = urls[index];
    const requestUrl = canonicalUrl.replace('https://www.ksubzone.com', baseUrl);
    try {
      const { response, body } = await fetchText(requestUrl);
      if (response.status !== 200) errors.push(`${canonicalUrl}: HTTP ${response.status}`);
      if (!/<title[^>]*>\s*[^<]+\s*<\/title>/i.test(body)) errors.push(`${canonicalUrl}: missing title`);
      if (!/<h1\b/i.test(body)) errors.push(`${canonicalUrl}: missing h1`);
      if (/<meta[^>]+(?:name=["']robots["'][^>]+content=["'][^"']*noindex|content=["'][^"']*noindex[^>]+name=["']robots)/i.test(body)) {
        errors.push(`${canonicalUrl}: contains noindex`);
      }
      const canonical = body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]
        || body.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1];
      if (!canonical) errors.push(`${canonicalUrl}: missing canonical`);
      else if (normalizeUrl(canonical) !== normalizeUrl(canonicalUrl)) {
        errors.push(`${canonicalUrl}: canonical points to ${canonical}`);
      }
      const linkCount = (body.match(/<a\s+[^>]*href=/gi) || []).length;
      if (linkCount < 3) errors.push(`${canonicalUrl}: only ${linkCount} crawlable links`);
    } catch (error) {
      errors.push(`${canonicalUrl}: ${error.message}`);
    }
  }
});

await Promise.all(workers);

if (errors.length > 0) {
  console.error(`SEO validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`SEO validation passed for ${urls.length} sitemap URL(s) at ${baseUrl}.`);
}
