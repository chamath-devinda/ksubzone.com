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
        return $time ? date('Y-m-d', $time) : date('Y-m-d');
    }

    private static function formatIso($dateStr) {
        $time = strtotime($dateStr);
        return $time ? date('Y-m-d\TH:i:s\Z', $time) : date('Y-m-d\TH:i:s\Z');
    }

    private static function serveCachedXml($cacheKey, $generatorCallback, $ttl = 3600) {
        header('Content-Type: application/xml; charset=UTF-8');
        header('Cache-Control: public, max-age=3600, s-maxage=3600');

        $cacheDir = __DIR__ . '/../temp/cache';
        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0777, true);
        }
        $cacheFile = $cacheDir . '/sitemap_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $cacheKey) . '.xml';

        if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $ttl)) {
            readfile($cacheFile);
            return;
        }

        ob_start();
        $generatorCallback();
        $content = ob_get_clean();

        if (!empty($content)) {
            @file_put_contents($cacheFile, $content);
        }
        echo $content;
    }

    public static function getRobotsTxt() {
        header('Content-Type: text/plain');
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
            echo '  <sitemap><loc>' . self::$siteUrl . '/news-sitemap.xml</loc></sitemap>' . "\n";
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
                $lastmod = self::formatDate($movie['updatedAt'] ?? '');
                echo "  <url>\n";
                echo "    <loc>" . self::$siteUrl . "/movie/{$slug}</loc>\n";
                echo "    <lastmod>{$lastmod}</lastmod>\n";
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

            $allSeasons = $db->find('seasons');
            $seasonsByDramaId = [];
            foreach ($allSeasons as $season) {
                $did = (string)($season['dramaId'] ?? '');
                if ($did !== '') {
                    $seasonsByDramaId[$did][] = $season;
                }
            }

            echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
            foreach ($dramas as $drama) {
                $slug    = self::permalinkSlug($drama);
                $lastmod = self::formatDate($drama['updatedAt'] ?? '');

                // Drama root page
                echo "  <url>\n";
                echo "    <loc>" . self::$siteUrl . "/drama/{$slug}</loc>\n";
                echo "    <lastmod>{$lastmod}</lastmod>\n";
                echo "    <changefreq>weekly</changefreq>\n";
                echo "    <priority>0.8</priority>\n";
                echo "  </url>\n";

                // Emit each real season page (e.g. /season-1, /season-2, /season-3 ...)
                $dramaId = (string)($drama['_id'] ?? '');
                $seasons = $seasonsByDramaId[$dramaId] ?? [];
                if (empty($seasons)) {
                    echo "  <url>\n";
                    echo "    <loc>" . self::$siteUrl . "/drama/{$slug}/season-1</loc>\n";
                    echo "    <lastmod>{$lastmod}</lastmod>\n";
                    echo "    <changefreq>weekly</changefreq>\n";
                    echo "    <priority>0.7</priority>\n";
                    echo "  </url>\n";
                } else {
                    foreach ($seasons as $season) {
                        $sNum     = (int)($season['seasonNumber'] ?? 1);
                        $sLastmod = self::formatDate($season['updatedAt'] ?? $drama['updatedAt'] ?? '');
                        echo "  <url>\n";
                        echo "    <loc>" . self::$siteUrl . "/drama/{$slug}/season-{$sNum}</loc>\n";
                        echo "    <lastmod>{$sLastmod}</lastmod>\n";
                        echo "    <changefreq>weekly</changefreq>\n";
                        echo "    <priority>0.7</priority>\n";
                        echo "  </url>\n";
                    }
                }
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
            foreach ($allEpisodes as $ep) {
                $dramaId  = (string)($ep['dramaId']  ?? '');
                $seasonId = (string)($ep['seasonId'] ?? '');

                $drama  = $dramaMap[$dramaId]  ?? null;
                $season = $seasonMap[$seasonId] ?? null;

                if (!$drama || !$season) continue;

                $slug      = self::permalinkSlug($drama);
                $lastmod   = self::formatDate($ep['updatedAt'] ?? $ep['createdAt'] ?? '');
                $seasonNum = (int)($season['seasonNumber'] ?? 1);
                $epNum     = (int)($ep['episodeNumber']    ?? 1);

                echo "  <url>\n";
                echo "    <loc>" . self::$siteUrl . "/drama/{$slug}/season-{$seasonNum}/episode-{$epNum}</loc>\n";
                echo "    <lastmod>{$lastmod}</lastmod>\n";
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
                echo "    <loc>" . self::$siteUrl . "/movie/{$slug}</loc>\n";
                echo "    <news:news>\n";
                echo "      <news:publication>\n";
                echo "        <news:name>KSubZone News</news:name>\n";
                echo "        <news:language>en</news:language>\n";
                echo "      </news:publication>\n";
                echo "      <news:publication_date>{$pubDate}</news:publication_date>\n";
                echo "      <news:title>" . htmlspecialchars($movie['title'] ?? '') . " - Imported and Available with Subtitles</news:title>\n";
                echo "    </news:news>\n";
                echo "  </url>\n";
            }

            foreach ($recentDramas as $drama) {
                $slug = self::permalinkSlug($drama);
                $pubDate = self::formatIso($drama['createdAt'] ?? '');
                echo "  <url>\n";
                echo "    <loc>" . self::$siteUrl . "/drama/{$slug}</loc>\n";
                echo "    <news:news>\n";
                echo "      <news:publication>\n";
                echo "        <news:name>KSubZone News</news:name>\n";
                echo "        <news:language>en</news:language>\n";
                echo "      </news:publication>\n";
                echo "      <news:publication_date>{$pubDate}</news:publication_date>\n";
                echo "      <news:title>" . htmlspecialchars($drama['title'] ?? '') . " - Now Streaming on KSubZone</news:title>\n";
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
                ['path' => '', 'priority' => '1.0', 'changefreq' => 'daily'],
                ['path' => '/search', 'priority' => '0.5', 'changefreq' => 'weekly'],
                ['path' => '/articles', 'priority' => '0.7', 'changefreq' => 'daily'],
            ];
            $today = date('Y-m-d');
            foreach ($pages as $page) {
                echo "  <url>\n";
                echo "    <loc>" . self::$siteUrl . $page['path'] . "</loc>\n";
                echo "    <lastmod>{$today}</lastmod>\n";
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
                $slug = htmlspecialchars($article['slug'] ?? '');
                $lastmod = self::formatDate($article['publishedAt'] ?? $article['updatedAt'] ?? '');
                echo "  <url>\n";
                echo "    <loc>" . self::$siteUrl . "/articles/{$slug}</loc>\n";
                echo "    <lastmod>{$lastmod}</lastmod>\n";
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
            $today = date('Y-m-d');
            foreach ($genres as $genre) {
                $slug = $genre['slug'] ?? '';
                $name = $genre['name'] ?? '';
                if (empty($slug) || empty($name)) continue;

                if (isset($usedGenres[strtolower(trim($name))])) {
                    $escapedSlug = htmlspecialchars($slug);
                    echo "  <url>\n";
                    echo "    <loc>" . self::$siteUrl . "/drama/genre/{$escapedSlug}</loc>\n";
                    echo "    <lastmod>{$today}</lastmod>\n";
                    echo "    <changefreq>weekly</changefreq>\n";
                    echo "    <priority>0.6</priority>\n";
                    echo "  </url>\n";

                    echo "  <url>\n";
                    echo "    <loc>" . self::$siteUrl . "/movie/genre/{$escapedSlug}</loc>\n";
                    echo "    <lastmod>{$today}</lastmod>\n";
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
            $today = date('Y-m-d');
            foreach ($usedCategories as $cat) {
                $slug = htmlspecialchars(Slug::slugify($cat));
                echo "  <url>\n";
                echo "    <loc>" . self::$siteUrl . "/articles/category/{$slug}</loc>\n";
                echo "    <lastmod>{$today}</lastmod>\n";
                echo "    <changefreq>weekly</changefreq>\n";
                echo "    <priority>0.6</priority>\n";
                echo "  </url>\n";
            }
            echo '</urlset>';
        });
    }
}
