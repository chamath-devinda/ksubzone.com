<?php
// PHP KSubZone Backend Entry Point & Router
// ============================================

// Never output PHP errors to browser — they corrupt JSON API responses
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Register manual class autoloader (zero external dependencies)
spl_autoload_register(function ($class) {
    $classPath = str_replace('\\', '/', $class);
    $parts = explode('/', $classPath);
    if (count($parts) > 1) {
        $parts[0] = strtolower($parts[0]);
    }
    $classPath = implode('/', $parts);
    $file = __DIR__ . '/' . $classPath . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

// Load environment variables
use Utils\Dotenv;
Dotenv::load(__DIR__ . '/.env');

// CORS Policy Handling with strict origins and credentials support
$allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://www.ksubzone.com',
    'https://ksubzone.com'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Access-Control-Allow-Credentials: true");
} else {
    $isProd = (strtolower($_ENV['NODE_ENV'] ?? '') === 'production');
    header("Access-Control-Allow-Origin: " . ($isProd ? 'https://www.ksubzone.com' : 'http://localhost:3000'));
    header("Access-Control-Allow-Credentials: true");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Helmet-like security headers stack
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: no-referrer-when-downgrade");

// Parse URI & Method
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Prevent caching for API requests
if (strpos($uri, '/api/') === 0) {
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Cache-Control: post-check=0, pre-check=0", false);
    header("Pragma: no-cache");
    header("Content-Type: application/json; charset=utf-8");
}

// Static upload file serving fallback
if (strpos($uri, '/uploads/') === 0) {
    $filePath = __DIR__ . $uri;
    if (file_exists($filePath)) {
        $ext = pathinfo($filePath, PATHINFO_EXTENSION);
        $mimeTypes = [
            'srt' => 'text/plain',
            'vtt' => 'text/vtt',
            'ass' => 'text/plain',
            'jpg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'mp4' => 'video/mp4'
        ];
        $contentType = $mimeTypes[strtolower($ext)] ?? 'application/octet-stream';
        header("Content-Type: {$contentType}");
        readfile($filePath);
        exit;
    } else {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['message' => 'Upload asset not found']);
        exit;
    }
}

// Dynamic visitor hit logger for pages (non-api/uploads requests).
// Uses VisitorGuard to skip bots and deduplicate same-IP same-day visits.
if ($method === 'GET' && strpos($uri, '/api/') !== 0) {
    try {
        if (\Utils\VisitorGuard::shouldCount()) {
            \Controllers\AnalyticsController::logPageVisit();
        }
    } catch (\Exception $e) {
        // Safe fallback to prevent locking crashes
    }
}

// Helper to sanitize and auto-update site content configuration references to KSubZone
function getSanitizedSiteContent($db) {
    $setting = $db->findOne('settings', ['key' => 'siteContent']);
    $value = $setting['value'] ?? \Utils\SiteContentDefaults::get();
    
    $modified = false;

    // Standardize primaryUrl to start with https://
    if (isset($value['brand']['primaryUrl'])) {
        $url = trim($value['brand']['primaryUrl']);
        if (!empty($url) && strpos($url, 'http://') !== 0 && strpos($url, 'https://') !== 0) {
            $value['brand']['primaryUrl'] = 'https://' . $url;
            $modified = true;
        }
    }
    
    // Check if the JSON contains old naming patterns (KDramaVerse, KDramaUniverse)
    $valueJson = json_encode($value);
    if (stripos($valueJson, 'kdramaverse') !== false || stripos($valueJson, 'kdramauniverse') !== false) {
        $valueJson = str_ireplace(
            ['kdramaverse', 'kdramauniverse'],
            ['KSubZone', 'KSubZone'],
            $valueJson
        );
        $value = json_decode($valueJson, true);
        $modified = true;
    }
    
    if ($modified) {
        // Write the sanitized value back to the database to update it permanently
        try {
            if ($setting && isset($setting['_id'])) {
                $db->updateOne('settings', ['_id' => $setting['_id']], ['value' => $value]);
            } else {
                $db->insertOne('settings', ['key' => 'siteContent', 'value' => $value]);
            }
        } catch (\Exception $e) {
            // Ignore database write failures during sanitation
        }
    }
    return $value;
}

// Define routes layout (Method, URI regex pattern, Handler pipeline)
$routes = [
    // SEO
    ['GET', '/robots.txt', 'Controllers\SeoController::getRobotsTxt'],
    ['GET', '/sitemap.xml', 'Controllers\SeoController::getSitemapIndex'],
    ['GET', '/sitemap-static.xml', 'Controllers\SeoController::getStaticSitemap'],
    ['GET', '/sitemap-movies.xml', 'Controllers\SeoController::getMoviesSitemap'],
    ['GET', '/sitemap-dramas.xml', 'Controllers\SeoController::getDramasSitemap'],
    ['GET', '/sitemap-episodes.xml', 'Controllers\SeoController::getEpisodesSitemap'],
    ['GET', '/sitemap-articles.xml', 'Controllers\SeoController::getArticlesSitemap'],
    ['GET', '/sitemap-genres.xml', 'Controllers\SeoController::getGenresSitemap'],
    ['GET', '/sitemap-categories.xml', 'Controllers\SeoController::getCategoriesSitemap'],
    ['GET', '/news-sitemap.xml', 'Controllers\SeoController::getNewsSitemap'],

    // System health
    ['GET', '/api/health', function() {
        $db = null;
        $dbError = null;
        try {
            $db = \Config\Database::getInstance();
        } catch (\Throwable $e) {
            $dbError = $e->getMessage();
        }
        
        $dbPath = dirname(__FILE__) . '/ksubzone.sqlite';
        $dbDir = dirname($dbPath);
        
        $dbFileExists = file_exists($dbPath);
        $dbFileWritable = $dbFileExists ? is_writable($dbPath) : false;
        $dbDirWritable = is_writable($dbDir);
        
        $writeTestOk = false;
        $writeTestError = null;
        if ($db && $db->getDriver() === 'sqlite') {
            try {
                // Try writing a temporary value to check if DB is locked/read-only
                $db->updateOne('settings', ['key' => 'health_write_test'], ['value' => time()]);
                $writeTestOk = true;
            } catch (\Throwable $e) {
                $writeTestError = $e->getMessage();
            }
        }
        
        // Safely mask password in DATABASE_URL for diagnostics
        $rawUrl = $_ENV['DATABASE_URL'] ?? getenv('DATABASE_URL') ?: '';
        $maskedUrl = '';
        if (!empty($rawUrl)) {
            $maskedUrl = preg_replace('/:(.*)@/', ':******@', $rawUrl);
        }
        
        header('Content-Type: application/json');
        echo json_encode([
            'status' => $dbError ? 'error' : 'ok',
            'serverTime' => date('Y-m-d H:i:s'),
            'databaseDriver' => $db ? $db->getDriver() : ($_ENV['DB_DRIVER'] ?? getenv('DB_DRIVER') ?: 'unknown'),
            'databaseError' => $dbError,
            'diagnostics' => [
                'dbFileExists' => $dbFileExists,
                'dbFileWritable' => $dbFileWritable,
                'dbDirWritable' => $dbDirWritable,
                'rawDatabaseUrlMasked' => $maskedUrl,
                'envDbHost' => $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'not set',
                'envDbDriver' => $_ENV['DB_DRIVER'] ?? getenv('DB_DRIVER') ?: 'not set',
                'dbPath' => basename($dbPath),
                'dbDir' => basename($dbDir),
                'writeTestOk' => $writeTestOk,
                'writeTestError' => $writeTestError
            ]
        ]);
    }],
    ['GET', '/api/debug-log.php', ['Middleware\AuthMiddleware::protectAdmin', function() {
        require_once __DIR__ . '/debug-log.php';
    }]],
    ['GET', '/api/reveal-db-secret-x7v9w2', ['Middleware\AuthMiddleware::protectAdmin', function() {
        header('Content-Type: application/json');
        echo json_encode([
            'databaseUrl' => $_ENV['DATABASE_URL'] ?? getenv('DATABASE_URL') ?: 'Not set'
        ]);
    }]],
    ['GET', '/api/clear-opcache-xyz', ['Middleware\AuthMiddleware::protectAdmin', function() {
        header('Content-Type: text/plain');
        if (function_exists('opcache_reset')) {
            if (opcache_reset()) {
                echo "OPcache flushed successfully!";
            } else {
                echo "Failed to reset OPcache.";
            }
        } else {
            echo "OPcache is not enabled or opcache_reset is disabled.";
        }
    }]],
    ['GET', '/api/clear-cache-xyz', ['Middleware\AuthMiddleware::protectAdmin', function() {
        header('Content-Type: text/plain');
        try {
            \Utils\Cache::flush();
            echo "Redis cache flushed successfully!";
        } catch (\Exception $e) {
            echo "Error flushing cache: " . $e->getMessage();
        }
    }]],
    ['GET', '/api/logs-xyz', ['Middleware\AuthMiddleware::protectAdmin', function() {
        header('Content-Type: text/plain');
        $logPaths = [
            dirname(__FILE__) . '/error_log',
            dirname(dirname(__FILE__)) . '/error_log',
            dirname(dirname(__FILE__)) . '/api/error_log',
            dirname(__FILE__) . '/../error_log',
            dirname(__FILE__) . '/import_error.log',
            dirname(__FILE__) . '/../import_error.log',
        ];
        foreach ($logPaths as $path) {
            if (file_exists($path)) {
                echo "=== LOG FILE: " . basename(dirname($path)) . "/" . basename($path) . " ===\n";
                $lines = file($path);
                $lastLines = array_slice($lines, -150);
                echo implode("", $lastLines);
                echo "\n\n";
            }
        }
        echo "=== END OF LOGS ===\n";
    }]],
    ['GET', '/api/stats-info', ['Middleware\AuthMiddleware::protectAdmin', function() {
        header('Content-Type: text/plain');
        try {
            $db = \Config\Database::getInstance();
            $driver = $db->getDriver();
            $dramas = $db->find('dramas');
            $seasons = $db->find('seasons');
            $episodes = $db->find('episodes');
            
            $doctorDrama = \Utils\Slug::findByPermalinkSlug($db, 'dramas', 'doctor-on-the-edge');
            $doctorSeasons = $doctorDrama ? $db->find('seasons', ['dramaId' => $doctorDrama['_id']]) : [];
            $doctorEpisodes = $doctorDrama ? $db->find('episodes', ['dramaId' => $doctorDrama['_id']]) : [];

            $controllerResponse = null;
            try {
                ob_start();
                \Controllers\DramaController::getDramaBySlug('doctor-on-the-edge');
                $rawResponse = ob_get_clean();
                $controllerResponse = json_decode($rawResponse, true);
            } catch (\Exception $ex) {
                $controllerResponse = ['error' => $ex->getMessage()];
            }

            $comparison = [];
            if ($doctorDrama) {
                $targetId = $doctorDrama['_id'];
                foreach ($seasons as $s) {
                    if (isset($s['dramaId'])) {
                        $sDramaId = $s['dramaId'];
                        $comparison[] = [
                            'season_id' => $s['_id'],
                            'season_dramaId' => $sDramaId,
                            'target_dramaId' => $targetId,
                            'season_dramaId_type' => gettype($sDramaId),
                            'target_dramaId_type' => gettype($targetId),
                            'season_dramaId_len' => strlen($sDramaId),
                            'target_dramaId_len' => strlen($targetId),
                            'season_dramaId_hex' => bin2hex($sDramaId),
                            'target_dramaId_hex' => bin2hex($targetId),
                            'strict_equal' => ($sDramaId === $targetId),
                            'loose_equal' => ($sDramaId == $targetId),
                            'cast_equal' => ((string)$sDramaId === (string)$targetId)
                        ];
                    }
                }
            }

            $res = [
                'driver' => $driver,
                'fallbackWarning' => $db->getFallbackWarning(),
                'doctorDrama' => $doctorDrama ? [
                    'id' => $doctorDrama['_id'],
                    'title' => $doctorDrama['title'],
                    'slug' => $doctorDrama['slug']
                ] : null,
                'doctorSeasons' => $doctorSeasons,
                'doctorEpisodes' => $doctorEpisodes,
                'id_comparison' => $comparison,
                'controllerResponse' => $controllerResponse,
                'dramas_count' => count($dramas),
                'seasons_count' => count($seasons),
                'episodes_count' => count($episodes),
                'subtitles_count' => $db->count('subtitles'),
                'users_count' => $db->count('users'),
                'settings_count' => $db->count('settings'),
                'dramas' => array_map(function($d) {
                    return [
                        'id' => $d['_id'],
                        'title' => $d['title'] ?? '?',
                        'tmdbId' => $d['tmdbId'] ?? '?'
                    ];
                }, $dramas),
                'seasons' => array_map(function($s) {
                    return [
                        'id' => $s['_id'],
                        'dramaId' => $s['dramaId'] ?? '?',
                        'seasonNumber' => $s['seasonNumber'] ?? '?'
                    ];
                }, $seasons),
                'episodes' => array_map(function($e) {
                    return [
                        'id' => $e['_id'],
                        'dramaId' => $e['dramaId'] ?? '?',
                        'seasonId' => $e['seasonId'] ?? '?',
                        'episodeNumber' => $e['episodeNumber'] ?? '?'
                    ];
                }, $episodes)
            ];
            echo base64_encode(json_encode($res));
        } catch (\Exception $e) {
            echo "ERR:" . base64_encode($e->getMessage() . "\n" . $e->getTraceAsString());
        }
    }]],
    ['GET', '/api/check-postgres-xyz', ['Middleware\AuthMiddleware::protectAdmin', function() {
        header('Content-Type: text/plain');
        try {
            $db = \Config\Database::getInstance();
            echo "Database Driver: " . $db->getDriver() . "\n";
            
            // Access PDO connection using reflection
            $ref = new ReflectionClass($db);
            $prop = $ref->getProperty('pdo');
            $prop->setAccessible(true);
            $pdo = $prop->getValue($db);
            
            if ($pdo) {
                echo "PDO Connection: OK\n\n";
                
                // List all tables
                echo "=== TABLES ===\n";
                $stmt = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
                $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
                foreach ($tables as $t) {
                    $cnt = $pdo->query("SELECT COUNT(*) FROM \"{$t}\"")->fetchColumn();
                    echo "- Table: {$t} (Rows: {$cnt})\n";
                }
                
                echo "\n=== DRAMAS ===\n";
                $dramas = $db->find('dramas');
                foreach ($dramas as $d) {
                    echo "- " . ($d['title'] ?? 'Unknown') . " (ID: " . ($d['tmdbId'] ?? 'N/A') . ", Status: " . ($d['status'] ?? 'N/A') . ", Slug: " . ($d['slug'] ?? 'N/A') . ")\n";
                }
                
                echo "\n=== MOVIES ===\n";
                $movies = $db->find('movies');
                foreach ($movies as $m) {
                    echo "- " . ($m['title'] ?? 'Unknown') . " (ID: " . ($m['tmdbId'] ?? 'N/A') . ", Status: " . ($m['status'] ?? 'N/A') . ", Slug: " . ($m['slug'] ?? 'N/A') . ")\n";
                }
                
                echo "\n=== SETTINGS (siteContent) ===\n";
                $siteContentSetting = $db->findOne('settings', ['key' => 'siteContent']);
                if ($siteContentSetting) {
                    echo json_encode($siteContentSetting['value'], JSON_PRETTY_PRINT) . "\n";
                } else {
                    echo "siteContent setting is empty or does not exist in DB.\n";
                }
            } else {
                echo "PDO Connection is null\n";
            }
        } catch (\Exception $e) {
            echo "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString();
        }
    }]],
    ['GET', '/api/site-content', function() {
        $db = \Config\Database::getInstance();
        header('Content-Type: application/json');
        echo json_encode(getSanitizedSiteContent($db));
    }],

    // Public Auth
    ['POST', '/api/auth/register', 'Controllers\AuthController::register'],
    ['POST', '/api/auth/verify-email', 'Controllers\AuthController::verifyEmail'],
    ['POST', '/api/auth/login', [function() { \Middleware\RateLimitMiddleware::limit('login', 5, 60); }, 'Controllers\AuthController::login']],
    ['POST', '/api/auth/logout', [function() {
        \Controllers\AuthController::setAuthCookie('kd_token', null);
        header('Content-Type: application/json');
        echo json_encode(['message' => 'Logged out successfully']);
    }]],
    ['POST', '/api/auth/forgot-password', 'Controllers\AuthController::forgotPassword'],
    ['POST', '/api/auth/reset-password', 'Controllers\AuthController::resetPassword'],


    // Protected Profiles
    ['GET', '/api/auth/me', ['Middleware\AuthMiddleware::protectUser', 'Controllers\AuthController::getMe']],
    ['PUT', '/api/auth/profile', ['Middleware\AuthMiddleware::protectUser', 'Controllers\UserController::updateUserProfile']],
    ['POST', '/api/auth/2fa', ['Middleware\AuthMiddleware::protectUser', 'Controllers\AuthController::toggle2FA']],
    ['GET', '/api/auth/notifications', ['Middleware\AuthMiddleware::protectUser', 'Controllers\UserController::getUserNotifications']],
    ['PUT', '/api/auth/notifications/([a-f0-9]+)/read', ['Middleware\AuthMiddleware::protectUser', 'Controllers\UserController::markNotificationRead']],

    // TEMP: One-time admin credential update (remove after use)
    ['GET', '/api/setup/update-admin', [function() {
        $key = $_GET['key'] ?? '';
        if ($key !== 'ksubzone_update_2026') {
            http_response_code(403);
            echo json_encode(['message' => 'Invalid key']);
            exit;
        }
        $db = \Config\Database::getInstance();
        $admin = $db->findOne('admins', []);
        if (!$admin) {
            http_response_code(404);
            echo json_encode(['message' => 'No admin found']);
            exit;
        }
        $newEmail    = 'chamathd2002@gmail.com';
        $newPassword = password_hash('#Burnitdown2002#', PASSWORD_BCRYPT);
        $db->updateOne('admins', ['_id' => $admin['_id']], [
            '$set' => ['email' => $newEmail, 'password' => $newPassword]
        ]);
        header('Content-Type: application/json');
        echo json_encode([
            'status'  => 'success',
            'message' => 'Admin credentials updated successfully!',
            'email'   => $newEmail,
            'id'      => $admin['_id']
        ]);
    }]],

    // TEMP: One-time links update (remove after use)
    ['GET', '/api/setup/update-links', [function() {
        $key = $_GET['key'] ?? '';
        if ($key !== 'ksubzone_update_2026') {
            http_response_code(403);
            echo json_encode(['message' => 'Invalid key']);
            exit;
        }
        
        $db = \Config\Database::getInstance();
        $setting = $db->findOne('settings', ['key' => 'siteContent']);
        
        header('Content-Type: application/json');
        if ($setting) {
            $value = $setting['value'];
            
            // Update navigation links
            $value['navigation']['links'] = [
                ['label' => 'Movies', 'url' => '/movies'],
                ['label' => 'TV Series', 'url' => '/dramas'],
                ['label' => 'Articles', 'url' => '/articles'],
                ['label' => 'About Us', 'url' => '/about'],
                ['label' => 'Contact Us', 'url' => '/contact']
            ];
            
            // Update footer links
            $value['footer']['links'] = [
                ['label' => 'Home', 'url' => '/'],
                ['label' => 'Movies', 'url' => '/movies'],
                ['label' => 'TV Series', 'url' => '/dramas'],
                ['label' => 'About Us', 'url' => '/about'],
                ['label' => 'Contact Us', 'url' => '/contact']
            ];
            
            $db->updateOne('settings', ['_id' => $setting['_id']], ['value' => $value]);
            echo json_encode(['status' => 'success', 'message' => 'Navigation and Footer links updated in the database.']);
        } else {
            require_once __DIR__ . '/utils/SiteContentDefaults.php';
            $defaults = \Utils\SiteContentDefaults::get();
            $db->insertOne('settings', ['key' => 'siteContent', 'value' => $defaults]);
            echo json_encode(['status' => 'success', 'message' => 'Initialized settings database with new links.']);
        }
    }]],

    // Public Catalog
    ['GET', '/api/media/home', 'Controllers\MovieController::getHomeCatalog'],
    ['GET', '/api/media/genres', 'Controllers\GenreController::getAllGenres'],
    ['GET', '/api/media/recommendations', 'Controllers\MovieController::getRecommendations'],
    ['GET', '/api/media/movies', 'Controllers\MovieController::getAllMovies'],
    ['GET', '/api/media/movies/([^/]+)', 'Controllers\MovieController::getMovieBySlug'],
    ['GET', '/api/media/dramas', 'Controllers\DramaController::getAllDramas'],
    ['GET', '/api/media/dramas/([^/]+)', 'Controllers\DramaController::getDramaBySlug'],
    ['GET', '/api/articles', 'Controllers\ArticleController::getArticles'],
    ['GET', '/api/articles/([^/]+)', 'Controllers\ArticleController::getArticleBySlug'],

    // Favorites & Lists
    ['POST', '/api/media/watchlist', ['Middleware\AuthMiddleware::protectUser', 'Controllers\UserController::toggleWatchlist']],
    ['POST', '/api/media/favorites', ['Middleware\AuthMiddleware::protectUser', 'Controllers\UserController::toggleFavorites']],
    ['POST', '/api/media/continue-watching', ['Middleware\AuthMiddleware::protectUser', 'Controllers\UserController::updateContinueWatching']],

    // Reviews & Comments
    ['POST', '/api/media/reviews', ['Middleware\AuthMiddleware::protectUser', function() { \Middleware\RateLimitMiddleware::limit('reviews', 5, 60); }, 'Controllers\CommentController::addReview']],
    ['GET', '/api/media/([a-f0-9]+)/reviews', 'Controllers\CommentController::getReviewsForMedia'],
    ['POST', '/api/media/reviews/([a-f0-9]+)/like', ['Middleware\AuthMiddleware::protectUser', 'Controllers\CommentController::likeReview']],
    ['POST', '/api/media/comments', ['Middleware\AuthMiddleware::protectUser', function() { \Middleware\RateLimitMiddleware::limit('comments', 10, 60); }, 'Controllers\CommentController::addComment']],
    ['GET', '/api/media/comments/target/([a-f0-9]+)', 'Controllers\CommentController::getCommentsForTarget'],
    ['POST', '/api/media/comments/([a-f0-9]+)/reply', ['Middleware\AuthMiddleware::protectUser', 'Controllers\CommentController::addReply']],
    ['POST', '/api/media/comments/([a-f0-9]+)/like', ['Middleware\AuthMiddleware::protectUser', 'Controllers\CommentController::likeComment']],

    // Subtitles
    ['POST', '/api/subtitles/upload', ['Middleware\AuthMiddleware::protectUser', function() { \Middleware\RateLimitMiddleware::limit('subtitle_upload', 3, 60); }, 'Controllers\SubtitleController::uploadSubtitle']],
    ['GET', '/api/subtitles/recent', 'Controllers\SubtitleController::getRecentApprovedSubtitles'],
    ['GET', '/api/subtitles/media/([a-f0-9,]+)', 'Controllers\SubtitleController::getSubtitlesForMedia'],
    ['POST', '/api/subtitles/([a-f0-9]+)/rate', ['Middleware\AuthMiddleware::protectUser', 'Controllers\SubtitleController::rateSubtitle']],
    ['POST', '/api/subtitles/([a-f0-9]+)/download', 'Controllers\SubtitleController::trackDownload'],
    ['GET', '/api/subtitles/([a-f0-9]+)/download', 'Controllers\SubtitleController::downloadSubtitleFile'],
    ['GET', '/api/subtitles/translator/([a-f0-9]+)', 'Controllers\SubtitleController::getUploaderHistory'],

    // Analytics Search Logging
    ['POST', '/api/analytics/search', 'Controllers\AnalyticsController::logSearchQueryRequest'],
    ['POST', '/api/analytics/visit', 'Controllers\AnalyticsController::logPageVisit'],

    // AI Features
    ['POST', '/api/ai/chat', 'Controllers\AiController::chat'],
    ['POST', '/api/ai/search', 'Controllers\AiController::smartSearch'],
    ['POST', '/api/admin/ai/translate', ['Middleware\AuthMiddleware::protectAdmin', 'Controllers\AiController::translateSubtitle']],
    ['POST', '/api/admin/ai/polish', ['Middleware\AuthMiddleware::protectAdmin', 'Controllers\AiController::polishSubtitle']],

    // Administrative Auth
    ['POST', '/api/admin/login', [function() { \Middleware\RateLimitMiddleware::limit('admin_login', 5, 60); }, 'Controllers\AuthController::adminLogin']],
    ['POST', '/api/admin/logout', [function() {
        \Controllers\AuthController::setAuthCookie('kd_admin_token', null);
        header('Content-Type: application/json');
        echo json_encode(['message' => 'Admin logged out successfully']);
    }]],
    ['GET', '/api/admin/me', ['Middleware\AuthMiddleware::protectAdmin', 'Controllers\AuthController::getAdminMe']],

    // Admin Dashboard
    ['GET', '/api/admin/dashboard', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('view_analytics'); },
        'Controllers\AnalyticsController::getDashboardStats'
    ]],

    // Admin TMDB Importer
    ['GET', '/api/admin/tmdb/search', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_movies'); },
        'Controllers\TmdbController::searchTmdb'
    ]],
    ['GET', '/api/admin/tmdb/discover/korean-dramas', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_movies'); },
        'Controllers\TmdbController::discoverKoreanDramas'
    ]],
    ['POST', '/api/admin/tmdb/import', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_movies'); },
        'Controllers\TmdbController::importFromTmdb'
    ]],
    ['POST', '/api/admin/tmdb/bulk-import', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_movies'); },
        'Controllers\TmdbController::bulkImportFromTmdb'
    ]],
    ['GET', '/api/admin/tmdb/history', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_movies'); },
        'Controllers\TmdbController::getImportHistory'
    ]],

    // Admin Movie CRUD
    ['GET', '/api/admin/movies', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_movies'); },
        'Controllers\MovieController::getAllMovies'
    ]],
    ['POST', '/api/admin/movies', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_movies'); },
        'Controllers\MovieController::createMovie'
    ]],
    ['PUT', '/api/admin/movies/([a-f0-9]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_movies'); },
        'Controllers\MovieController::updateMovie'
    ]],
    ['DELETE', '/api/admin/movies/([a-f0-9]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_movies'); },
        'Controllers\MovieController::deleteMovie'
    ]],
    // Admin Drama CRUD
    ['GET', '/api/admin/dramas', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_dramas'); },
        'Controllers\DramaController::getAdminDramas'
    ]],

    ['POST', '/api/admin/dramas', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_dramas'); },
        'Controllers\DramaController::createDrama'
    ]],
    ['PUT', '/api/admin/dramas/([a-f0-9]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_dramas'); },
        'Controllers\DramaController::updateDrama'
    ]],
    ['DELETE', '/api/admin/dramas/([a-f0-9]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_dramas'); },
        'Controllers\DramaController::deleteDrama'
    ]],

    // Admin Season CRUD
    ['POST', '/api/admin/seasons', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_dramas'); },
        'Controllers\DramaController::addSeason'
    ]],
    ['PUT', '/api/admin/seasons/([a-f0-9]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_dramas'); },
        'Controllers\DramaController::editSeason'
    ]],
    ['DELETE', '/api/admin/seasons/([a-f0-9]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_dramas'); },
        'Controllers\DramaController::deleteSeason'
    ]],

    // Admin Episode CRUD
    ['POST', '/api/admin/episodes', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_dramas'); },
        'Controllers\DramaController::addEpisode'
    ]],
    ['PUT', '/api/admin/episodes/([a-f0-9]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_dramas'); },
        'Controllers\DramaController::editEpisode'
    ]],
    ['DELETE', '/api/admin/episodes/([a-f0-9]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_dramas'); },
        'Controllers\DramaController::deleteEpisode'
    ]],

    // Admin Subtitle approver queue
    ['POST', '/api/admin/subtitles/upload', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('approve_subtitles'); },
        'Controllers\SubtitleController::uploadSubtitle'
    ]],
    ['GET', '/api/admin/subtitles', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('approve_subtitles'); },
        'Controllers\SubtitleController::getModerationQueue'
    ]],
    ['PUT', '/api/admin/subtitles/([a-f0-9]+)/approve', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('approve_subtitles'); },
        'Controllers\SubtitleController::updateApprovalStatus'
    ]],
    ['PUT', '/api/admin/subtitles/([a-f0-9]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('approve_subtitles'); },
        'Controllers\SubtitleController::editSubtitle'
    ]],
    ['DELETE', '/api/admin/subtitles/([a-f0-9]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('approve_subtitles'); },
        'Controllers\SubtitleController::deleteSubtitle'
    ]],

    // Admin reviews & comments moderation
    ['GET', '/api/admin/reviews', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_comments'); },
        'Controllers\CommentController::adminGetAllReviews'
    ]],
    ['DELETE', '/api/admin/reviews/([a-f0-9]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_comments'); },
        'Controllers\CommentController::adminDeleteReview'
    ]],
    ['GET', '/api/admin/comments', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_comments'); },
        'Controllers\CommentController::adminGetAllComments'
    ]],
    ['DELETE', '/api/admin/comments/([a-f0-9]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_comments'); },
        'Controllers\CommentController::adminDeleteComment'
    ]],

    // Admin Article CRUD
    ['GET', '/api/admin/articles', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_articles'); },
        'Controllers\ArticleController::adminGetArticles'
    ]],
    ['POST', '/api/admin/articles', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_articles'); },
        'Controllers\ArticleController::createArticle'
    ]],
    ['PUT', '/api/admin/articles/([a-f0-9]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_articles'); },
        'Controllers\ArticleController::updateArticle'
    ]],
    ['DELETE', '/api/admin/articles/([a-f0-9]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_articles'); },
        'Controllers\ArticleController::deleteArticle'
    ]],

    // Admin Users lists
    ['GET', '/api/admin/users', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_users'); },
        function() {
            $db = \Config\Database::getInstance();
            $users = $db->find('users', [], ['sort' => ['createdAt' => -1]]);
            foreach ($users as &$u) {
                unset($u['password']);
            }
            header('Content-Type: application/json');
            echo json_encode($users);
        }
    ]],
    ['PUT', '/api/admin/users/([a-f0-9]+)/status', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_users'); },
        function($id) {
            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            $status = $body['status'] ?? '';
            if (!in_array($status, ['active', 'suspended'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid status']);
                return;
            }
            $db = \Config\Database::getInstance();
            $user = $db->findOne('users', ['_id' => $id]);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['message' => 'User not found']);
                return;
            }
            $db->updateOne('users', ['_id' => $id], ['status' => $status]);
            $user['status'] = $status;
            unset($user['password']);
            header('Content-Type: application/json');
            echo json_encode(['message' => "User status changed to {$status}", 'user' => $user]);
        }
    ]],
    ['PUT', '/api/admin/users/([a-f0-9]+)/dashboard-access', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_users'); },
        function($id) {
            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            $hasDashboardAccess = $body['hasDashboardAccess'] ?? null;
            if ($hasDashboardAccess === null || !is_bool($hasDashboardAccess)) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid access value']);
                return;
            }
            $db = \Config\Database::getInstance();
            $user = $db->findOne('users', ['_id' => $id]);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['message' => 'User not found']);
                return;
            }
            $db->updateOne('users', ['_id' => $id], ['hasDashboardAccess' => $hasDashboardAccess]);
            $user['hasDashboardAccess'] = $hasDashboardAccess;
            unset($user['password']);
            header('Content-Type: application/json');
            echo json_encode(['message' => "Dashboard access " . ($hasDashboardAccess ? 'granted' : 'revoked'), 'user' => $user]);
        }
    ]],

    // Admin settings management
    ['GET', '/api/admin/site-content', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_settings'); },
        function() {
            $db = \Config\Database::getInstance();
            header('Content-Type: application/json');
            echo json_encode(getSanitizedSiteContent($db));
        }
    ]],
    ['PUT', '/api/admin/site-content', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_settings'); },
        function() {
            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            $db = \Config\Database::getInstance();
            $existing = $db->findOne('settings', ['key' => 'siteContent']);
            if ($existing) {
                $db->updateOne('settings', ['_id' => $existing['_id']], ['value' => $body]);
                $setting = $db->findOne('settings', ['_id' => $existing['_id']]);
            } else {
                $setting = $db->insertOne('settings', ['key' => 'siteContent', 'value' => $body]);
            }
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Site content saved successfully', 'content' => $setting['value'] ?? $body]);
        }
    ]],
    ['GET', '/api/admin/settings', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_settings'); },
        function() {
            $db = \Config\Database::getInstance();
            $settings = $db->find('settings');
            header('Content-Type: application/json');
            echo json_encode($settings);
        }
    ]],
    ['POST', '/api/admin/settings', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_settings'); },
        function() {
            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            $key = $body['key'] ?? '';
            $value = $body['value'] ?? null;
            if (empty($key) || $value === null) {
                http_response_code(400);
                echo json_encode(['message' => 'Key and Value are required']);
                return;
            }
            $db = \Config\Database::getInstance();
            $existing = $db->findOne('settings', ['key' => $key]);
            if ($existing) {
                $db->updateOne('settings', ['_id' => $existing['_id']], ['value' => $value]);
                $setting = $db->findOne('settings', ['_id' => $existing['_id']]);
            } else {
                $setting = $db->insertOne('settings', ['key' => $key, 'value' => $value]);
            }
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Settings saved successfully', 'setting' => $setting]);
        }
    ]],
    // Admin Backup & Restore Management
    ['GET', '/api/admin/backup/settings', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_settings'); },
        'Controllers\BackupController::getSettings'
    ]],
    ['POST', '/api/admin/backup/settings', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_settings'); },
        'Controllers\BackupController::saveSettings'
    ]],
    ['GET', '/api/admin/backup/list', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_settings'); },
        'Controllers\BackupController::listBackups'
    ]],
    ['POST', '/api/admin/backup/create', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_settings'); },
        'Controllers\BackupController::createBackup'
    ]],
    ['POST', '/api/admin/backup/restore', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_settings'); },
        'Controllers\BackupController::restoreBackup'
    ]],
    ['DELETE', '/api/admin/backup/delete/([a-z0-9_-]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_settings'); },
        'Controllers\BackupController::deleteBackup'
    ]],
    // Admin Database Viewer APIs
    ['POST', '/api/admin/database/wipe-all', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_settings'); },
        function() {
            $db = \Config\Database::getInstance();
            $collections = [
                'movies', 'dramas', 'seasons', 'episodes', 'subtitles', 
                'reviews', 'comments', 'analytics', 'articles', 'notifications'
            ];
            $counts = [];
            foreach ($collections as $col) {
                $counts[$col] = $db->deleteMany($col, []);
            }
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'All media, subtitle, and article records have been wiped successfully.',
                'driver' => $db->getDriver(),
                'deleted' => $counts
            ]);
        }
    ]],
    ['GET', '/api/admin/database/collections', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_settings'); },
        function() {
            $db = \Config\Database::getInstance();
            $collections = [
                'users', 'admins', 'roles', 'permissions', 'movies', 
                'dramas', 'seasons', 'episodes', 'genres', 'subtitles', 
                'reviews', 'comments', 'analytics', 'settings', 'articles'
            ];
            $stats = [];
            foreach ($collections as $col) {
                $stats[] = [
                    'name' => $col,
                    'count' => $db->count($col)
                ];
            }
            header('Content-Type: application/json');
            echo json_encode([
                'driver' => $db->getDriver(),
                'collections' => $stats
            ]);
        }
    ]],
    ['GET', '/api/admin/database/collections/([a-z0-9_-]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_settings'); },
        function($collectionName) {
            $db = \Config\Database::getInstance();
            $allowedCollections = [
                'users', 'admins', 'roles', 'permissions', 'movies', 
                'dramas', 'seasons', 'episodes', 'genres', 'subtitles', 
                'reviews', 'comments', 'analytics', 'settings', 'articles'
            ];
            
            if (!in_array($collectionName, $allowedCollections)) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid collection name']);
                return;
            }
            
            $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
            $skip = isset($_GET['skip']) ? intval($_GET['skip']) : 0;
            
            $docs = $db->find($collectionName, [], [
                'limit' => $limit,
                'skip' => $skip,
                'sort' => ['createdAt' => -1]
            ]);
            
            $total = $db->count($collectionName);
            
            header('Content-Type: application/json');
            echo json_encode([
                'collection' => $collectionName,
                'total' => $total,
                'limit' => $limit,
                'skip' => $skip,
                'documents' => $docs
            ]);
        }
    ]],
    ['PUT', '/api/admin/database/collections/([a-z0-9_-]+)/([^/]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_settings'); },
        function($collectionName, $id) {
            $body = json_decode(file_get_contents('php://input'), true) ?: [];
            $db = \Config\Database::getInstance();
            
            $allowedCollections = [
                'users', 'admins', 'roles', 'permissions', 'movies', 
                'dramas', 'seasons', 'episodes', 'genres', 'subtitles', 
                'reviews', 'comments', 'analytics', 'settings', 'articles'
            ];
            
            if (!in_array($collectionName, $allowedCollections)) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid collection name']);
                return;
            }
            
            unset($body['_id'], $body['createdAt'], $body['updatedAt']);
            
            $updated = $db->updateOne($collectionName, ['_id' => $id], $body);
            
            if ($updated > 0) {
                $doc = $db->findOne($collectionName, ['_id' => $id]);
                header('Content-Type: application/json');
                echo json_encode(['message' => 'Record updated successfully', 'document' => $doc]);
            } else {
                http_response_code(404);
                echo json_encode(['message' => 'Record not found or no changes made']);
            }
        }
    ]],
    ['DELETE', '/api/admin/database/collections/([a-z0-9_-]+)/([^/]+)', [
        'Middleware\AuthMiddleware::protectAdmin',
        function() { \Middleware\AuthMiddleware::hasPermission('manage_settings'); },
        function($collectionName, $id) {
            $db = \Config\Database::getInstance();
            $allowedCollections = [
                'users', 'admins', 'roles', 'permissions', 'movies', 
                'dramas', 'seasons', 'episodes', 'genres', 'subtitles', 
                'reviews', 'comments', 'analytics', 'settings', 'articles'
            ];
            
            if (!in_array($collectionName, $allowedCollections)) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid collection name']);
                return;
            }
            
            $deleted = $db->deleteOne($collectionName, ['_id' => $id]);
            
            if ($deleted > 0) {
                header('Content-Type: application/json');
                echo json_encode(['message' => 'Record deleted successfully']);
            } else {
                http_response_code(404);
                echo json_encode(['message' => 'Record not found']);
            }
        }
    ]]
];

$matched = false;
foreach ($routes as $route) {
    list($routeMethod, $pattern, $handlers) = $route;

    if ($method !== $routeMethod) {
        continue;
    }

    $regex = '#^' . $pattern . '$#i';
    if (preg_match($regex, $uri, $matches)) {
        array_shift($matches); // Remove first match
        $matched = true;

        try {
            if (is_array($handlers)) {
                foreach ($handlers as $handler) {
                    if (is_string($handler)) {
                        call_user_func_array($handler, $matches);
                    } else {
                        call_user_func_array($handler, $matches);
                    }
                }
            } else {
                if (is_string($handlers)) {
                    call_user_func_array($handlers, $matches);
                } else {
                    call_user_func_array($handlers, $matches);
                }
            }
        } catch (\Throwable $e) {
            error_log("API Error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Server Error',
                'error' => $e->getMessage()
            ]);
        }
        exit;
    }
}

if (!$matched) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['message' => 'API route not found']);
}
