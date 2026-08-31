<?php
namespace Controllers;

use Config\Database;
use Utils\Slug;

class SeoController {
    private static $siteUrl = 'https://www.ksubzone.com';

    private static function permalinkSlug($item) {
        $slug = Slug::normalizePermalinkSlug($item['slug'] ?? '');
        return $slug ?: Slug::slugify($item['title'] ?? '');
    }

    private static function formatDate($dateStr) {
        $time = strtotime($dateStr);
        return $time ? date('Y-m-d', $time) : null;
    }

    private static function formatIso($dateStr) {
        $time = strtotime($dateStr);
        return $time ? date('Y-m-d\TH:i:s\Z', $time) : date('Y-m-d\TH:i:s\Z');
    }

    private static function xml($value) {
        return htmlspecialchars((string)$value, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    private static function serveCachedXml($cacheKey, $generatorCallback, $ttl = 3600) {
        header('Content-Type: application/xml; charset=UTF-8');
        header('Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');

        $cacheDir = __DIR__ . '/../temp/cache';
        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0777, true);
        }
        $cacheFile = $cacheDir . '/sitemap_v3_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $cacheKey) . '.xml';

        if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $ttl)) {
            readfile($cacheFile);
            return;
        }

        ob_start();
        $generatorCallback();
        $content = ob_get_clean();

        if (!empty($content)) {
            @file_put_contents($cacheFile, $content, LOCK_EX);
        }
        echo $content;
    }

    public static function getRobotsTxt() {
        header('Content-Type: text/plain; charset=UTF-8');
        header('Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
        echo "User-agent: *\n";
        echo "Allow: /\n";
        echo "Disallow: /management/\n";
        echo "Disallow: /api/\n\n";
        echo "Sitemap: " . self::$siteUrl . "/sitemap.xml\n";
    }

    public static function getSitemapIndex() {
        self::serveCachedXml('index', function() {
            echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            echo '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
            echo '  <sitemap><loc>' . self::$siteUrl . '/sitemap-static.xml</loc></sitemap>' . "\n";
            echo '  <sitemap><loc>' . self::$siteUrl . '/sitemap-movies.xml</loc></sitemap>' . "\n";
            echo '  <sitemap><loc>' . self::$siteUrl . '/sitemap-dramas.xml</loc></sitemap>' . "\n";
            echo '  <sitemap><loc>' . self::$siteUrl . '/sitemap-episodes.xml</loc></sitemap>' . "\n";
            echo '  <sitemap><loc>' . self::$siteUrl . '/sitemap-articles.xml</loc></sitemap>' . "\n";
            echo '  <sitemap><loc>' . self::$siteUrl . '/sitemap-genres.xml</loc></sitemap>' . "\n";
            echo '  <sitemap><loc>' . self::$siteUrl . '/sitemap-categories.xml</loc></sitemap>' . "\n";
            echo '</sitemapindex>';
        });
    }

    public static function getMoviesSitemap() {
        self::serveCachedXml('movies', function() {
            $db = Database::getInstance();
            $movies = $db->find('movies', ['status' => ['$in' => ['Published', 'Upcoming']]]);

            echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
            foreach ($movies as $movie) {
                $slug = self::permalinkSlug($movie);
                if (!$slug) continue;
                $lastmod = self::formatDate($movie['updatedAt'] ?? '');
                echo "  <url>\n";
                echo "    <loc>" . self::xml(self::$siteUrl . "/movie/{$slug}") . "</loc>\n";
                if ($lastmod) echo "    <lastmod>{$lastmod}</lastmod>\n";
                echo "    <changefreq>weekly</changefreq>\n";
                echo "    <priority>0.8</priority>\n";
                echo "  </url>\n";
            }
            echo '</urlset>';
        });
    }

    public static function getDramasSitemap() {
        self::serveCachedXml('dramas', function() {
            $db = Database::getInstance();
            $dramas = $db->find('dramas', ['status' => ['$in' => ['Published', 'Upcoming']]]);

            echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
            foreach ($dramas as $drama) {
                $slug    = self::permalinkSlug($drama);
                if (!$slug) continue;
                $lastmod = self::formatDate($drama['updatedAt'] ?? '');

                // Drama root page
                echo "  <url>\n";
                echo "    <loc>" . self::xml(self::$siteUrl . "/drama/{$slug}") . "</loc>\n";
                if ($lastmod) echo "    <lastmod>{$lastmod}</lastmod>\n";
                echo "    <changefreq>weekly</changefreq>\n";
                echo "    <priority>0.8</priority>\n";
                echo "  </url>\n";
            }
            echo '</urlset>';
        });
    }

    public static function getEpisodesSitemap() {
        self::serveCachedXml('episodes', function() {
            $db = Database::getInstance();

            $allDramas   = $db->find('dramas', ['status' => ['$in' => ['Published', 'Upcoming']]]);
            $allSeasons  = $db->find('seasons');
            $allEpisodes = $db->find('episodes');

            // Build O(1) lookup maps keyed by _id string
            $dramaMap = [];
            foreach ($allDramas as $d) {
                $dramaMap[(string)($d['_id'] ?? '')] = $d;
            }
            $seasonMap = [];
            foreach ($allSeasons as $s) {
                $seasonMap[(string)($s['_id'] ?? '')] = $s;
            }

            echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
            $seenUrls = [];
            foreach ($allEpisodes as $ep) {
                $dramaId  = (string)($ep['dramaId']  ?? '');
                $seasonId = (string)($ep['seasonId'] ?? '');

                $drama  = $dramaMap[$dramaId]  ?? null;
                $season = $seasonMap[$seasonId] ?? null;

                if (!$drama || !$season) continue;

                $slug      = self::permalinkSlug($drama);
                if (!$slug) continue;
                $lastmod   = self::formatDate($ep['updatedAt'] ?? $ep['createdAt'] ?? '');
                $seasonNum = (int)($season['seasonNumber'] ?? 1);
                $epNum     = (int)($ep['episodeNumber']    ?? 1);
                if ($seasonNum < 1 || $epNum < 1) continue;

                $url = self::$siteUrl . "/drama/{$slug}/season-{$seasonNum}/episode-{$epNum}";
                if (isset($seenUrls[$url])) continue;
                $seenUrls[$url] = true;

                echo "  <url>\n";
                echo "    <loc>" . self::xml($url) . "</loc>\n";
                if ($lastmod) echo "    <lastmod>{$lastmod}</lastmod>\n";
                echo "    <changefreq>monthly</changefreq>\n";
                echo "    <priority>0.6</priority>\n";
                echo "  </url>\n";
            }
            echo '</urlset>';
        });
    }

    public static function getNewsSitemap() {
        self::serveCachedXml('news', function() {
            $db = Database::getInstance();
            $twoDaysAgo = date('Y-m-d H:i:s', time() - 48 * 60 * 60);
            $recentMovies = $db->find('movies', [
                'status' => 'Published',
                'createdAt' => ['$gte' => $twoDaysAgo]
            ], ['limit' => 10]);

            $recentDramas = $db->find('dramas', [
                'status' => 'Published',
                'createdAt' => ['$gte' => $twoDaysAgo]
            ], ['limit' => 10]);

            echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' . "\n";
            echo '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">' . "\n";

            foreach ($recentMovies as $movie) {
                $slug = self::permalinkSlug($movie);
                $pubDate = self::formatIso($movie['createdAt'] ?? '');
                echo "  <url>\n";
                echo "    <loc>" . self::xml(self::$siteUrl . "/movie/{$slug}") . "</loc>\n";
                echo "    <news:news>\n";
                echo "      <news:publication>\n";
                echo "        <news:name>KSubZone News</news:name>\n";
                echo "        <news:language>en</news:language>\n";
                echo "      </news:publication>\n";
                echo "      <news:publication_date>{$pubDate}</news:publication_date>\n";
                echo "      <news:title>" . self::xml(($movie['title'] ?? '') . " - Imported and Available with Subtitles") . "</news:title>\n";
                echo "    </news:news>\n";
                echo "  </url>\n";
            }

            foreach ($recentDramas as $drama) {
                $slug = self::permalinkSlug($drama);
                $pubDate = self::formatIso($drama['createdAt'] ?? '');
                echo "  <url>\n";
                echo "    <loc>" . self::xml(self::$siteUrl . "/drama/{$slug}") . "</loc>\n";
                echo "    <news:news>\n";
                echo "      <news:publication>\n";
                echo "        <news:name>KSubZone News</news:name>\n";
                echo "        <news:language>en</news:language>\n";
                echo "      </news:publication>\n";
                echo "      <news:publication_date>{$pubDate}</news:publication_date>\n";
                echo "      <news:title>" . self::xml(($drama['title'] ?? '') . " - Now Streaming on KSubZone") . "</news:title>\n";
                echo "      </news:news>\n";
                echo "  </url>\n";
            }

            echo '</urlset>';
        });
    }

    public static function getStaticSitemap() {
        self::serveCachedXml('static', function() {
            echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
            $pages = [
                ['path' => '/', 'priority' => '1.0', 'changefreq' => 'daily'],
                ['path' => '/movies', 'priority' => '0.9', 'changefreq' => 'daily'],
                ['path' => '/dramas', 'priority' => '0.9', 'changefreq' => 'daily'],
                ['path' => '/genres', 'priority' => '0.7', 'changefreq' => 'weekly'],
                ['path' => '/articles', 'priority' => '0.7', 'changefreq' => 'daily'],
                ['path' => '/about', 'priority' => '0.4', 'changefreq' => 'monthly'],
                ['path' => '/contact', 'priority' => '0.4', 'changefreq' => 'monthly'],
            ];
            foreach ($pages as $page) {
                echo "  <url>\n";
                echo "    <loc>" . self::xml(self::$siteUrl . $page['path']) . "</loc>\n";
                echo "    <changefreq>{$page['changefreq']}</changefreq>\n";
                echo "    <priority>{$page['priority']}</priority>\n";
                echo "  </url>\n";
            }
            echo '</urlset>';
        });
    }

    public static function getArticlesSitemap() {
        self::serveCachedXml('articles', function() {
            $db = Database::getInstance();
            $articles = $db->find('articles', ['status' => 'Published']);

            echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
            foreach ($articles as $article) {
                $slug = $article['slug'] ?? '';
                if (!$slug) continue;
                $lastmod = self::formatDate($article['publishedAt'] ?? $article['updatedAt'] ?? '');
                echo "  <url>\n";
                echo "    <loc>" . self::xml(self::$siteUrl . "/articles/{$slug}") . "</loc>\n";
                if ($lastmod) echo "    <lastmod>{$lastmod}</lastmod>\n";
                echo "    <changefreq>weekly</changefreq>\n";
                echo "    <priority>0.7</priority>\n";
                echo "  </url>\n";
            }
            echo '</urlset>';
        });
    }

    public static function getGenresSitemap() {
        self::serveCachedXml('genres', function() {
            $db = Database::getInstance();
            $genres = $db->find('genres');
            $dramas = $db->find('dramas', ['status' => 'Published']);
            $movies = $db->find('movies', ['status' => 'Published']);

            $usedGenres = [];
            foreach ($dramas as $drama) {
                if (!empty($drama['keywords'])) {
                    foreach ($drama['keywords'] as $kw) {
                        $usedGenres[strtolower(trim($kw))] = true;
                    }
                }
            }
            foreach ($movies as $movie) {
                if (!empty($movie['keywords'])) {
                    foreach ($movie['keywords'] as $kw) {
                        $usedGenres[strtolower(trim($kw))] = true;
                    }
                }
            }

            echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
            $seenGenreUrls = [];
            foreach ($genres as $genre) {
                $slug = $genre['slug'] ?? '';
                $name = $genre['name'] ?? '';
                if (empty($slug) || empty($name)) continue;

                if (isset($usedGenres[strtolower(trim($name))])) {
                    $escapedSlug = self::xml($slug);
                    $dramaUrl = self::$siteUrl . "/drama/genre/{$slug}";
                    $movieUrl = self::$siteUrl . "/movie/genre/{$slug}";
                    if (isset($seenGenreUrls[$dramaUrl])) continue;
                    $seenGenreUrls[$dramaUrl] = true;
                    $seenGenreUrls[$movieUrl] = true;
                    echo "  <url>\n";
                    echo "    <loc>" . self::xml($dramaUrl) . "</loc>\n";
                    echo "    <changefreq>weekly</changefreq>\n";
                    echo "    <priority>0.6</priority>\n";
                    echo "  </url>\n";

                    echo "  <url>\n";
                    echo "    <loc>" . self::xml($movieUrl) . "</loc>\n";
                    echo "    <changefreq>weekly</changefreq>\n";
                    echo "    <priority>0.6</priority>\n";
                    echo "  </url>\n";
                }
            }
            echo '</urlset>';
        });
    }

    public static function getCategoriesSitemap() {
        self::serveCachedXml('categories', function() {
            $db = Database::getInstance();
            $articles = $db->find('articles', ['status' => 'Published']);

            $usedCategories = [];
            foreach ($articles as $article) {
                if (!empty($article['category'])) {
                    $cat = trim($article['category']);
                    $usedCategories[strtolower($cat)] = $cat;
                }
            }

            echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
            foreach ($usedCategories as $cat) {
                $slug = self::xml(Slug::slugify($cat));
                echo "  <url>\n";
                echo "    <loc>" . self::$siteUrl . "/articles/category/{$slug}</loc>\n";
                echo "    <changefreq>weekly</changefreq>\n";
                echo "    <priority>0.6</priority>\n";
                echo "  </url>\n";
            }
            echo '</urlset>';
        });
    }
}
