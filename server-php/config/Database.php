<?php
namespace Config;

class Database {
    private static $instance = null;
    private $driver = 'sqlite'; // 'mongodb', 'sqlite', 'mysql', or 'pgsql'
    private $manager = null; // MongoDB Manager
    private $dbName = 'ksubzone';
    private $pdo = null; // SQLite/MySQL PDO connection
    private $fallbackWarning = null; // Store warning if database falls back

    private function __construct() {
        // Load env configuration if available
        $mongoUri = $_ENV['MONGODB_URI'] ?? getenv('MONGODB_URI') ?: '';
        $this->dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'ksubzone';
        $dbDriver = $_ENV['DB_DRIVER'] ?? getenv('DB_DRIVER') ?: '';
        $nodeEnv = $_ENV['NODE_ENV'] ?? getenv('NODE_ENV') ?: '';
        $allowSqlFallback = strtolower($_ENV['ALLOW_SQL_FALLBACK'] ?? getenv('ALLOW_SQL_FALLBACK') ?: '') === 'true';
        $isProduction = strtolower($nodeEnv) === 'production';

        $mysqlCircuitBreaker = dirname(__FILE__) . '/.mysql_failed';
        $databaseUrl = $_ENV['DATABASE_URL'] ?? getenv('DATABASE_URL') ?: '';
        $wantsPgsql = $dbDriver === 'pgsql' || (!empty($databaseUrl) && strpos($databaseUrl, 'postgresql') === 0 && $dbDriver !== 'mongodb' && $dbDriver !== 'mysql');
        $wantsMongo = !$wantsPgsql && ($dbDriver === 'mongodb' || (!empty($mongoUri) && $dbDriver !== 'mysql') || ($isProduction && $dbDriver !== 'mysql' && $dbDriver !== 'pgsql'));

        if ($wantsPgsql) {
            try {
                $this->initPostgres($databaseUrl);
            } catch (\Exception $e) {
                if ($allowSqlFallback && !$isProduction) {
                    $this->fallbackWarning = "PostgreSQL Connection Failed: " . $e->getMessage() . " (SQLite Fallback active)";
                    error_log($this->fallbackWarning);
                    $this->initSQLite();
                } else {
                    throw new \RuntimeException('PostgreSQL (Supabase) connection failed: ' . $e->getMessage(), 0, $e);
                }
            }
        } elseif ($wantsMongo) {
            if (empty($mongoUri)) {
                throw new \RuntimeException('MONGODB_URI is required when DB_DRIVER=mongodb or NODE_ENV=production.');
            }

            try {
                $this->initMongoDB($mongoUri);
            } catch (\Exception $e) {
                if ($allowSqlFallback && !$isProduction) {
                    $this->fallbackWarning = "MongoDB Connection Failed: " . $e->getMessage() . " (SQLite Fallback active because ALLOW_SQL_FALLBACK=true)";
                    error_log($this->fallbackWarning);
                    $this->initSQLite();
                } else {
                    throw new \RuntimeException('MongoDB connection is required and fallback is disabled: ' . $e->getMessage(), 0, $e);
                }
            }
        } elseif ($dbDriver === 'mysql') {
            if (!$allowSqlFallback) {
                throw new \RuntimeException('MySQL is disabled. Set DB_DRIVER=mongodb and MONGODB_URI for this deployment.');
            }

            try {
                if (file_exists($mysqlCircuitBreaker)) {
                    $lastFailed = (int)@file_get_contents($mysqlCircuitBreaker);
                    if (time() - $lastFailed <= 60) {
                        throw new \RuntimeException('MySQL retry circuit is still open.');
                    }
                    @unlink($mysqlCircuitBreaker);
                }
                $this->initMySQL();
            } catch (\Exception $e) {
                @file_put_contents($mysqlCircuitBreaker, time());
                $this->fallbackWarning = "MySQL Connection Failed: " . $e->getMessage() . " (SQLite Fallback active because ALLOW_SQL_FALLBACK=true)";
                error_log($this->fallbackWarning);
                $this->initSQLite();
            }
        } else {
            if ($allowSqlFallback || !$isProduction) {
                $this->initSQLite();
            } else {
                throw new \RuntimeException('No database configured. Set DB_DRIVER=mongodb/pgsql or DATABASE_URL for production.');
            }
        }

        // Initialize schema and seed data if needed
        $this->initializeDatabase();
    }

    private function initMongoDB($mongoUri) {
        if (!class_exists('MongoDB\Driver\Manager')) {
            throw new \RuntimeException('PHP MongoDB extension is not installed or enabled.');
        }

        // Parse DB name from URI if present, e.g., mongodb+srv://user:pass@host/dbname?options
        $path = parse_url($mongoUri, PHP_URL_PATH);
        if (!empty($path) && trim($path, '/') !== '') {
            $this->dbName = trim($path, '/');
        }

        $this->manager = new \MongoDB\Driver\Manager($mongoUri, [
            'connectTimeoutMS' => 5000,
            'serverSelectionTimeoutMS' => 5000
        ]);

        // Ping connection to verify it works before serving API data.
        $command = new \MongoDB\Driver\Command(['ping' => 1]);
        $this->manager->executeCommand('admin', $command);
        $this->driver = 'mongodb';
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getFallbackWarning() {
        return $this->fallbackWarning;
    }

    private function initSQLite() {
        $this->driver = 'sqlite';
        $dbPath = dirname(__DIR__) . '/ksubzone.sqlite';
        $this->pdo = new \PDO("sqlite:" . $dbPath);
        $this->pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(\PDO::ATTR_DEFAULT_FETCH_MODE, \PDO::FETCH_ASSOC);

        // Optimize SQLite performance for concurrency
        try {
            $this->pdo->exec("PRAGMA journal_mode=WAL;");
            $this->pdo->exec("PRAGMA busy_timeout=5000;");
            $this->pdo->exec("PRAGMA synchronous=NORMAL;");
        } catch (\Exception $e) {
            // Ignore PRAGMA configuration errors
        }
    }

    private function initMySQL() {
        $this->driver = 'mysql';
        $host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: '127.0.0.1';
        $port = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '3306';
        $dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'ksubzone';
        $user = $_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'root';
        $pass = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: '';

        // Connect to MySQL server without dbname to create database if it doesn't exist
        $pdo = new \PDO("mysql:host={$host};port={$port}", $user, $pass, [
            \PDO::ATTR_TIMEOUT => 2,
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION
        ]);
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

        // Connect to the specific database
        $this->pdo = new \PDO("mysql:host={$host};port={$port};dbname={$dbName}", $user, $pass, [
            \PDO::ATTR_TIMEOUT => 2,
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC
        ]);
    }

    private function initPostgres(string $databaseUrl = '') {
        $this->driver = 'pgsql';

        if (!empty($databaseUrl)) {
            // Robustly parse DATABASE_URL to handle special characters (like @ or :) in password
            $urlWithoutScheme = str_replace(['postgresql://', 'postgres://'], '', $databaseUrl);
            $lastAtPos = strrpos($urlWithoutScheme, '@');
            
            if ($lastAtPos !== false) {
                $credentials = substr($urlWithoutScheme, 0, $lastAtPos);
                $connection = substr($urlWithoutScheme, $lastAtPos + 1);
                
                $credParts = explode(':', $credentials, 2);
                $user = rawurldecode($credParts[0]);
                $pass = isset($credParts[1]) ? rawurldecode($credParts[1]) : '';
                
                $connParts = explode('/', $connection, 2);
                $hostPort = $connParts[0];
                $dbAndParams = $connParts[1] ?? 'postgres';
                
                $hostParts = explode(':', $hostPort, 2);
                $host = $hostParts[0];
                $port = $hostParts[1] ?? 5432;
                
                $dbParts = explode('?', $dbAndParams, 2);
                $dbName = $dbParts[0];
            } else {
                // Fallback to standard parse_url if no '@' found
                $parts = parse_url($databaseUrl);
                $host   = $parts['host'] ?? 'localhost';
                $port   = $parts['port'] ?? 5432;
                $dbName = ltrim($parts['path'] ?? '/postgres', '/');
                $user   = rawurldecode($parts['user'] ?? 'postgres');
                $pass   = rawurldecode($parts['pass'] ?? '');
            }

            // Auto-translate IPv6 host to IPv4 Session Pooler (port 5432 is open on most firewalls)
            if ($host === 'db.ejvczjiueysbiewzsuin.supabase.co') {
                $host = 'aws-1-ap-south-1.pooler.supabase.com';
                $port = 5432;
                if (strpos($user, 'ejvczjiueysbiewzsuin') === false) {
                    $user = $user . '.ejvczjiueysbiewzsuin';
                }
            }

            $dsn = "pgsql:host={$host};port={$port};dbname={$dbName};sslmode=require";
        } else {
            $host   = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'localhost';
            $port   = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '5432';
            $dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'postgres';
            $user   = $_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'postgres';
            $pass   = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: '';

            if ($host === 'db.ejvczjiueysbiewzsuin.supabase.co') {
                $host = 'aws-1-ap-south-1.pooler.supabase.com';
                $port = 5432;
                if (strpos($user, 'ejvczjiueysbiewzsuin') === false) {
                    $user = $user . '.ejvczjiueysbiewzsuin';
                }
            }

            $dsn    = "pgsql:host={$host};port={$port};dbname={$dbName}";
        }

        $this->pdo = new \PDO($dsn, $user, $pass, [
            \PDO::ATTR_TIMEOUT            => 8,
            \PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES   => true, // required for named params in pgsql
        ]);
    }

    public function getDriver() {
        return $this->driver;
    }

    private function initializeDatabase() {
        // Skip setup if database is already initialized and matches current schema version
        $schemaVersion = '2026_v3_imports';
        $flagFile = dirname(__FILE__) . '/.db_initialized_' . $this->driver;
        
        $tablesExist = true;
        try {
            if ($this->driver === 'pgsql') {
                $stmt = $this->pdo->query("SELECT 1 FROM information_schema.tables WHERE table_name = 'movies' LIMIT 1");
                $tablesExist = $stmt->fetch() !== false;
            } elseif ($this->driver === 'sqlite') {
                $stmt = $this->pdo->query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='movies' LIMIT 1");
                $tablesExist = $stmt->fetch() !== false;
            }
        } catch (\Exception $e) {
            $tablesExist = false;
        }

        if (file_exists($flagFile) && trim(@file_get_contents($flagFile)) === $schemaVersion && $tablesExist) {
            return;
        }

        if ($this->driver === 'sqlite' || $this->driver === 'mysql' || $this->driver === 'pgsql') {
            // Ensure collections exist as tables
            $collections = [
                'users', 'admins', 'roles', 'permissions', 'movies', 
                'dramas', 'seasons', 'episodes', 'genres', 'subtitles', 
                'reviews', 'comments', 'analytics', 'settings', 'articles',
                'notifications', 'tmdb_imports'
            ];
            foreach ($collections as $col) {
                if ($this->driver === 'sqlite') {
                    $this->pdo->exec("CREATE TABLE IF NOT EXISTS `{$col}` (
                        _id TEXT PRIMARY KEY,
                        data TEXT,
                        createdAt TEXT,
                        updatedAt TEXT
                    )");
                    $this->pdo->exec("CREATE INDEX IF NOT EXISTS `idx_{$col}_createdAt` ON `{$col}` (createdAt DESC)");
                } elseif ($this->driver === 'pgsql') {
                    $this->pdo->exec("CREATE TABLE IF NOT EXISTS \"{$col}\" (
                        \"_id\" TEXT PRIMARY KEY,
                        \"data\" JSONB,
                        \"createdAt\" TEXT,
                        \"updatedAt\" TEXT
                    )");
                    $this->pdo->exec("CREATE INDEX IF NOT EXISTS \"idx_{$col}_createdAt\" ON \"{$col}\" (\"createdAt\" DESC)");
                } else {
                    $this->pdo->exec("CREATE TABLE IF NOT EXISTS `{$col}` (
                        `_id` VARCHAR(255) PRIMARY KEY,
                        `data` LONGTEXT,
                        `createdAt` VARCHAR(50),
                        `updatedAt` VARCHAR(50),
                        INDEX `idx_{$col}_createdAt` (`createdAt` DESC)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                }
            }
        }

        // Seed roles & super admin
        $this->seedRolesAndAdmin();
        $this->seedArticles();
        $this->ensureIndexesExist();

        // Write the flag file to mark successful setup
        @file_put_contents($flagFile, $schemaVersion);
    }

    private function ensureIndexesExist() {
        if ($this->driver === 'sqlite') {
            $sqliteIndexes = [
                'subtitles' => [
                    'idx_subtitles_mediaId' => "json_extract(data, '$.mediaId')",
                    'idx_subtitles_approvalStatus' => "json_extract(data, '$.approvalStatus')",
                    'idx_subtitles_uploader' => "json_extract(data, '$.uploader')",
                    'idx_subtitles_media_approval' => "json_extract(data, '$.mediaId'), json_extract(data, '$.approvalStatus')"
                ],
                'users' => [
                    'idx_users_username' => "json_extract(data, '$.username')",
                    'idx_users_email' => "json_extract(data, '$.email')",
                ],
                'admins' => [
                    'idx_admins_username' => "json_extract(data, '$.username')",
                    'idx_admins_email' => "json_extract(data, '$.email')",
                ],
                'movies' => [
                    'idx_movies_slug' => "json_extract(data, '$.slug')",
                    'idx_movies_status' => "json_extract(data, '$.status')",
                    'idx_movies_isTrending' => "json_extract(data, '$.isTrending')",
                    'idx_movies_isFeatured' => "json_extract(data, '$.isFeatured')",
                    'idx_movies_isHistorical' => "json_extract(data, '$.isHistorical')",
                ],
                'dramas' => [
                    'idx_dramas_slug' => "json_extract(data, '$.slug')",
                    'idx_dramas_status' => "json_extract(data, '$.status')",
                    'idx_dramas_isTrending' => "json_extract(data, '$.isTrending')",
                    'idx_dramas_isFeatured' => "json_extract(data, '$.isFeatured')",
                    'idx_dramas_isHistorical' => "json_extract(data, '$.isHistorical')",
                ],
                'seasons' => [
                    'idx_seasons_dramaId' => "json_extract(data, '$.dramaId')",
                ],
                'episodes' => [
                    'idx_episodes_dramaId' => "json_extract(data, '$.dramaId')",
                    'idx_episodes_seasonId' => "json_extract(data, '$.seasonId')",
                ],
                'comments' => [
                    'idx_comments_mediaId' => "json_extract(data, '$.mediaId')",
                ],
                'reviews' => [
                    'idx_reviews_mediaId' => "json_extract(data, '$.mediaId')",
                ],
                'articles' => [
                    'idx_articles_slug' => "json_extract(data, '$.slug')",
                    'idx_articles_status' => "json_extract(data, '$.status')",
                ],
                'notifications' => [
                    'idx_notifications_recipient' => "json_extract(data, '$.recipient')",
                    'idx_notifications_recipientType' => "json_extract(data, '$.recipientType')",
                ],
                'tmdb_imports' => [
                    'idx_tmdb_imports_tmdbId' => "json_extract(data, '$.tmdbId')",
                ]
            ];

            foreach ($sqliteIndexes as $table => $tableIndexes) {
                foreach ($tableIndexes as $indexName => $expr) {
                    try {
                        $this->pdo->exec("CREATE INDEX IF NOT EXISTS `{$indexName}` ON `{$table}` ({$expr})");
                    } catch (\Exception $e) {
                        error_log("Failed to create SQLite index {$indexName}: " . $e->getMessage());
                    }
                }
            }
        } elseif ($this->driver === 'mysql') {
            $mysqlIndexes = [
                'subtitles' => [
                    'idx_subtitles_mediaId' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.mediaId'))",
                    'idx_subtitles_approvalStatus' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.approvalStatus'))",
                    'idx_subtitles_uploader' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.uploader'))",
                ],
                'users' => [
                    'idx_users_username' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.username'))",
                    'idx_users_email' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.email'))",
                ],
                'admins' => [
                    'idx_admins_username' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.username'))",
                    'idx_admins_email' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.email'))",
                ],
                'movies' => [
                    'idx_movies_slug' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.slug'))",
                    'idx_movies_status' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.status'))",
                    'idx_movies_isTrending' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.isTrending'))",
                    'idx_movies_isFeatured' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.isFeatured'))",
                    'idx_movies_isHistorical' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.isHistorical'))",
                ],
                'dramas' => [
                    'idx_dramas_slug' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.slug'))",
                    'idx_dramas_status' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.status'))",
                    'idx_dramas_isTrending' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.isTrending'))",
                    'idx_dramas_isFeatured' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.isFeatured'))",
                    'idx_dramas_isHistorical' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.isHistorical'))",
                ],
                'seasons' => [
                    'idx_seasons_dramaId' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.dramaId'))",
                ],
                'episodes' => [
                    'idx_episodes_dramaId' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.dramaId'))",
                    'idx_episodes_seasonId' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.seasonId'))",
                ],
                'comments' => [
                    'idx_comments_mediaId' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.mediaId'))",
                ],
                'reviews' => [
                    'idx_reviews_mediaId' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.mediaId'))",
                ],
                'articles' => [
                    'idx_articles_slug' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.slug'))",
                    'idx_articles_status' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.status'))",
                ],
                'notifications' => [
                    'idx_notifications_recipient' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.recipient'))",
                    'idx_notifications_recipientType' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.recipientType'))",
                ],
                'tmdb_imports' => [
                    'idx_tmdb_imports_tmdbId' => "JSON_UNQUOTE(JSON_EXTRACT(data, '$.tmdbId'))",
                ]
            ];

            foreach ($mysqlIndexes as $table => $tableIndexes) {
                foreach ($tableIndexes as $indexName => $expr) {
                    try {
                        $this->pdo->exec("CREATE INDEX `{$indexName}` ON `{$table}` ((CAST({$expr} AS CHAR(255))))");
                    } catch (\Exception $e) {
                        // Ignore error if index already exists or version doesn't support functional indexes
                    }
                }
            }
        } elseif ($this->driver === 'pgsql') {
            $pgsqlIndexes = [
                'subtitles' => [
                    'idx_subtitles_mediaId' => "(\"data\"->>'mediaId')",
                    'idx_subtitles_approvalStatus' => "(\"data\"->>'approvalStatus')",
                    'idx_subtitles_uploader' => "(\"data\"->>'uploader')",
                    'idx_subtitles_media_approval' => "(\"data\"->>'mediaId'), (\"data\"->>'approvalStatus')"
                ],
                'users' => [
                    'idx_users_username' => "(\"data\"->>'username')",
                    'idx_users_email' => "(\"data\"->>'email')",
                ],
                'admins' => [
                    'idx_admins_username' => "(\"data\"->>'username')",
                    'idx_admins_email' => "(\"data\"->>'email')",
                ],
                'movies' => [
                    'idx_movies_slug' => "(\"data\"->>'slug')",
                    'idx_movies_status' => "(\"data\"->>'status')",
                    'idx_movies_isTrending' => "(\"data\"->>'isTrending')",
                    'idx_movies_isFeatured' => "(\"data\"->>'isFeatured')",
                    'idx_movies_isHistorical' => "(\"data\"->>'isHistorical')",
                ],
                'dramas' => [
                    'idx_dramas_slug' => "(\"data\"->>'slug')",
                    'idx_dramas_status' => "(\"data\"->>'status')",
                    'idx_dramas_isTrending' => "(\"data\"->>'isTrending')",
                    'idx_dramas_isFeatured' => "(\"data\"->>'isFeatured')",
                    'idx_dramas_isHistorical' => "(\"data\"->>'isHistorical')",
                ],
                'seasons' => [
                    'idx_seasons_dramaId' => "(\"data\"->>'dramaId')",
                ],
                'episodes' => [
                    'idx_episodes_dramaId' => "(\"data\"->>'dramaId')",
                    'idx_episodes_seasonId' => "(\"data\"->>'seasonId')",
                ],
                'comments' => [
                    'idx_comments_mediaId' => "(\"data\"->>'mediaId')",
                ],
                'reviews' => [
                    'idx_reviews_mediaId' => "(\"data\"->>'mediaId')",
                ],
                'articles' => [
                    'idx_articles_slug' => "(\"data\"->>'slug')",
                    'idx_articles_status' => "(\"data\"->>'status')",
                ],
                'notifications' => [
                    'idx_notifications_recipient' => "(\"data\"->>'recipient')",
                    'idx_notifications_recipientType' => "(\"data\"->>'recipientType')",
                ],
                'tmdb_imports' => [
                    'idx_tmdb_imports_tmdbId' => "(\"data\"->>'tmdbId')",
                ]
            ];

            foreach ($pgsqlIndexes as $table => $tableIndexes) {
                foreach ($tableIndexes as $indexName => $expr) {
                    try {
                        $this->pdo->exec("CREATE INDEX IF NOT EXISTS \"{$indexName}\" ON \"{$table}\" ({$expr})");
                    } catch (\Exception $e) {
                        error_log("Failed to create PostgreSQL index {$indexName}: " . $e->getMessage());
                    }
                }
            }
        }
    }

    // Helper: Convert string _id to MongoDB ObjectId
    private function convertIdToObjectId($filter) {
        if (!is_array($filter)) return $filter;
        foreach ($filter as $k => $v) {
            if ($k === '_id') {
                if (is_string($v) && preg_match('/^[a-f0-9]{24}$/i', $v)) {
                    $filter[$k] = new \MongoDB\BSON\ObjectId($v);
                } elseif (is_array($v)) {
                    foreach ($v as $op => $val) {
                        if ($op === '$in' && is_array($val)) {
                            foreach ($val as $idx => $idStr) {
                                if (is_string($idStr) && preg_match('/^[a-f0-9]{24}$/i', $idStr)) {
                                    $val[$idx] = new \MongoDB\BSON\ObjectId($idStr);
                                }
                            }
                            $v[$op] = $val;
                        } elseif (is_string($val) && preg_match('/^[a-f0-9]{24}$/i', $val)) {
                            $v[$op] = new \MongoDB\BSON\ObjectId($val);
                        }
                    }
                    $filter[$k] = $v;
                }
            } elseif (is_array($v)) {
                $filter[$k] = $this->convertIdToObjectId($v);
            }
        }
        return $filter;
    }

    // Helper: Clean MongoDB cursor objects
    private function serializeDoc($doc) {
        if (!$doc) return null;
        $doc = (array)$doc;
        foreach ($doc as $k => $v) {
            if ($v instanceof \MongoDB\BSON\ObjectId) {
                $doc[$k] = (string)$v;
            } elseif ($v instanceof \MongoDB\BSON\UTCDateTime) {
                $doc[$k] = $v->toDateTime()->format('Y-m-d H:i:s');
            } elseif ($v instanceof \stdClass || is_array($v)) {
                $doc[$k] = $this->serializeDoc((array)$v);
            }
        }
        return $doc;
    }

    // Helper: SQL field translation (JSON path by driver)
    private function sqlField($field) {
        if (in_array($field, ['_id', 'createdAt', 'updatedAt'])) {
            return $this->driver === 'pgsql' ? "\"{$field}\"" : $field;
        }

        $parts = explode('.', $field);
        $lastPart = end($parts);
        $numericFields = [
            'viewCount', 'imdbRating', 'tmdbRating', 'runtime', 'tmdbId', 
            'episodeNumber', 'seasonNumber', 'subtitleCount', 'downloadCount', 'downloads', 'rating'
        ];
        $isNumeric = in_array($lastPart, $numericFields);

        if ($this->driver === 'pgsql') {
            // PostgreSQL: use ->> for text extraction from JSON/JSONB
            if (count($parts) === 1) {
                $expr = "\"data\"->>'{$field}'";
            } else {
                $jsonPath = '{' . implode(',', $parts) . '}';
                $expr = "\"data\" #>> '{$jsonPath}'";
            }
            if ($isNumeric) {
                $castType = in_array($lastPart, ['imdbRating', 'tmdbRating', 'rating']) ? 'NUMERIC' : 'INTEGER';
                return "CAST(COALESCE(NULLIF({$expr}, ''), '0') AS {$castType})";
            }
            return $expr;
        }
        $path = '$.' . str_replace('.', '$.', $field);
        if ($this->driver === 'mysql') {
            $expr = "JSON_UNQUOTE(JSON_EXTRACT(data, '{$path}'))";
            if ($isNumeric) {
                $castType = in_array($lastPart, ['imdbRating', 'tmdbRating', 'rating']) ? 'DECIMAL(10,2)' : 'SIGNED';
                return "CAST(NULLIF({$expr}, '') AS {$castType})";
            }
            return $expr;
        }
        return "json_extract(data, '{$path}')";
    }

    // Helper: Translate Mongo query array to SQLite SQL WHERE clause
    private function buildWhere($filter, &$params, $collection = '') {
        if (empty($filter)) return "";
        $clauses = [];
        foreach ($filter as $k => $v) {
            $paramName = ":" . preg_replace('/[^a-zA-Z0-9_]/', '', $k) . "_" . rand(100, 999);
            
            if ($k === '$text') {
                if (isset($v['$search'])) {
                    $searchQuery = trim($v['$search']);
                    if ($searchQuery !== '') {
                        $words = preg_split('/\s+/', $searchQuery);
                        $wordClauses = [];
                        $likeOp = $this->driver === 'pgsql' ? 'ILIKE' : 'LIKE';
                        
                        // Select fields based on collection type
                        if ($collection === 'articles') {
                            $fields = ['title', 'excerpt', 'content'];
                        } else {
                            $fields = ['title', 'originalTitle', 'description'];
                        }
                        
                        $sqlFields = [];
                        foreach ($fields as $field) {
                            $sqlFields[] = $this->sqlField($field);
                        }
                        
                        foreach ($words as $idx => $word) {
                            $word = trim($word);
                            if ($word === '') continue;
                            
                            $p = $paramName . "_search_" . $idx;
                            
                            // Build OR clause for all fields for this word
                            $fieldClauses = [];
                            foreach ($sqlFields as $sqlF) {
                                $fieldClauses[] = "{$sqlF} {$likeOp} {$p}";
                            }
                            $wordClauses[] = "(" . implode(" OR ", $fieldClauses) . ")";
                            $params[$p] = '%' . $word . '%';
                        }
                        
                        if (!empty($wordClauses)) {
                            $clauses[] = "(" . implode(" AND ", $wordClauses) . ")";
                        }
                    } else {
                        $clauses[] = "1 = 1";
                    }
                }
                continue;
            }

            if ($k === '$or') {
                $orClauses = [];
                foreach ($v as $idx => $orCond) {
                    $orParams = [];
                    $subWhere = $this->buildWhere($orCond, $orParams);
                    if (!empty($subWhere)) {
                        $orClauses[] = "(" . substr($subWhere, 7) . ")"; // Strip " WHERE "
                        $params = array_merge($params, $orParams);
                    }
                }
                if (!empty($orClauses)) {
                    $clauses[] = "(" . implode(" OR ", $orClauses) . ")";
                }
                continue;
            }

            $sqlField = $this->sqlField($k);

            if (is_array($v)) {
                foreach ($v as $op => $val) {
                    if ($op === '$gte') {
                        $clauses[] = "{$sqlField} >= {$paramName}_gte";
                        $params["{$paramName}_gte"] = $val;
                    } elseif ($op === '$lte') {
                        $clauses[] = "{$sqlField} <= {$paramName}_lte";
                        $params["{$paramName}_lte"] = $val;
                    } elseif ($op === '$gt') {
                        $clauses[] = "{$sqlField} > {$paramName}_gt";
                        $params["{$paramName}_gt"] = $val;
                    } elseif ($op === '$lt') {
                        $clauses[] = "{$sqlField} < {$paramName}_lt";
                        $params["{$paramName}_lt"] = $val;
                    } elseif ($op === '$in') {
                        $subClauses = [];
                        $isArrayField = in_array($k, ['keywords', 'tags']);
                        if (is_array($val)) {
                            if (empty($val)) {
                                $clauses[] = "1 = 0";
                            } elseif ($isArrayField) {
                                foreach ($val as $idx => $item) {
                                    $p = "{$paramName}_in_{$idx}";
                                    $likeOp = $this->driver === 'pgsql' ? 'ILIKE' : 'LIKE';
                                    $subClauses[] = "{$sqlField} {$likeOp} {$p}";
                                    $params[$p] = '%' . $item . '%';
                                }
                                if (!empty($subClauses)) {
                                    $clauses[] = "(" . implode(" OR ", $subClauses) . ")";
                                }
                            } else {
                                $pNames = [];
                                foreach ($val as $idx => $item) {
                                    $p = "{$paramName}_in_{$idx}";
                                    $pNames[] = $p;
                                    $params[$p] = $item;
                                }
                                $clauses[] = "{$sqlField} IN (" . implode(", ", $pNames) . ")";
                            }
                        }
                    } elseif ($op === '$regex') {
                        $pattern = (string)$val;
                        $like = $pattern;
                        $like = preg_replace('/^\^/', '', $like);
                        $like = preg_replace('/\$$/', '', $like);
                        $like = str_replace(['\-', '.*', '.+', '[0-9]+'], ['-', '%', '%', '%'], $like);
                        $like = str_replace('\\', '', $like);
                        $likeOp = $this->driver === 'pgsql' ? 'ILIKE' : 'LIKE';
                        $clauses[] = "{$sqlField} {$likeOp} {$paramName}_regex";
                        $params["{$paramName}_regex"] = $like;
                    } elseif ($op === '$ne') {
                        $clauses[] = "{$sqlField} != {$paramName}_ne";
                        $params["{$paramName}_ne"] = is_bool($val) ? ($this->driver === 'pgsql' ? ($val ? 'true' : 'false') : ($val ? 1 : 0)) : $val;
                    }
                }
            } else {
                $clauses[] = "{$sqlField} = {$paramName}";
                $params[$paramName] = is_bool($v) ? ($this->driver === 'pgsql' ? ($v ? 'true' : 'false') : ($v ? 1 : 0)) : $v;
            }
        }
        return empty($clauses) ? "" : " WHERE " . implode(" AND ", $clauses);
    }

    // ----------------------------------------------------
    // UNIFIED QUERY API
    // ----------------------------------------------------

    public function find($collection, $filter = [], $options = []) {
        if ($this->driver === 'mongodb') {
            $filter = $this->convertIdToObjectId($filter);
            $query = new \MongoDB\Driver\Query($filter, $options);
            $cursor = $this->manager->executeQuery("{$this->dbName}.{$collection}", $query);
            $results = [];
            foreach ($cursor as $doc) {
                $results[] = $this->serializeDoc($doc);
            }
            return $results;
        } else {
            $params = [];
            $where = $this->buildWhere($filter, $params, $collection);
            $table = ($this->driver === 'pgsql') ? "\"{$collection}\"" : $collection;
            $sql = "SELECT * FROM {$table}" . $where;

            if (isset($options['sort'])) {
                $sortParts = [];
                foreach ($options['sort'] as $field => $dir) {
                    $direction = ($dir === -1 || $dir === 'desc' || $dir === 'DESC') ? 'DESC' : 'ASC';
                    $sortParts[] = $this->sqlField($field) . " {$direction}";
                }
                if (!empty($sortParts)) {
                    $sql .= " ORDER BY " . implode(", ", $sortParts);
                }
            } else {
                $sql .= " ORDER BY " . $this->sqlField('createdAt') . " DESC";
            }

            if (isset($options['limit'])) {
                $sql .= " LIMIT " . (int)$options['limit'];
            }
            if (isset($options['skip'])) {
                $sql .= " OFFSET " . (int)$options['skip'];
            }

            $stmt = $this->pdo->prepare($sql);
            foreach ($params as $key => $val) {
                if ($this->driver === 'pgsql') {
                    // In PostgreSQL, JSONB fields are queried using ->> which returns TEXT.
                    // To prevent strict operator errors (text = integer), bind non-null parameters as PARAM_STR.
                    $type = is_null($val) ? \PDO::PARAM_NULL : \PDO::PARAM_STR;
                    if (is_bool($val)) {
                        $val = $val ? 'true' : 'false';
                    } elseif ($val !== null) {
                        $val = (string)$val;
                    }
                } else {
                    $type = is_int($val) ? \PDO::PARAM_INT : (is_bool($val) ? \PDO::PARAM_BOOL : (is_null($val) ? \PDO::PARAM_NULL : \PDO::PARAM_STR));
                }
                $stmt->bindValue($key, $val, $type);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll();

            $results = [];
            foreach ($rows as $row) {
                $data = json_decode($row['data'], true) ?: [];
                $data['_id'] = $row['_id'];
                $data['createdAt'] = $row['createdAt'];
                $data['updatedAt'] = $row['updatedAt'];
                $results[] = $data;
            }
            return $results;
        }
    }

    public function findOne($collection, $filter = [], $options = []) {
        $options['limit'] = 1;
        $results = $this->find($collection, $filter, $options);
        return !empty($results) ? $results[0] : null;
    }

    public function insertOne($collection, $data) {
        if ($this->driver === 'mongodb') {
            if (isset($data['_id']) && is_string($data['_id']) && preg_match('/^[a-f0-9]{24}$/i', $data['_id'])) {
                $data['_id'] = new \MongoDB\BSON\ObjectId($data['_id']);
            } elseif (!isset($data['_id'])) {
                $data['_id'] = new \MongoDB\BSON\ObjectId();
            }
        } else {
            if (!isset($data['_id'])) {
                $data['_id'] = bin2hex(random_bytes(12));
            }
        }
        
        $now = date('Y-m-d H:i:s');
        if (!isset($data['createdAt'])) {
            $data['createdAt'] = $now;
        }
        if (!isset($data['updatedAt'])) {
            $data['updatedAt'] = $now;
        }

        if ($this->driver === 'mongodb') {
            $bulk = new \MongoDB\Driver\BulkWrite();
            $bulk->insert($data);
            $this->manager->executeBulkWrite("{$this->dbName}.{$collection}", $bulk);
            return $this->serializeDoc($data);
        } else {
            $id = $data['_id'];
            $created = $data['createdAt'];
            $updated = $data['updatedAt'];

            $doc = $data;
            unset($doc['_id'], $doc['createdAt'], $doc['updatedAt']);

            if ($this->driver === 'pgsql') {
                $q = "\"_id\", \"data\", \"createdAt\", \"updatedAt\"";
                $stmt = $this->pdo->prepare("INSERT INTO \"{$collection}\" ({$q}) VALUES (:id, :data, :created, :updated) ON CONFLICT (\"_id\") DO NOTHING");
            } else {
                $stmt = $this->pdo->prepare("INSERT INTO {$collection} (_id, data, createdAt, updatedAt) VALUES (:id, :data, :created, :updated)");
            }
            $stmt->execute([
                'id' => $id,
                'data' => json_encode($doc),
                'created' => $created,
                'updated' => $updated
            ]);
            return $data;
        }
    }

    public function updateOne($collection, $filter, $update, $options = []) {
        if ($this->driver === 'mongodb') {
            $filter = $this->convertIdToObjectId($filter);
        }
        $doc = $this->findOne($collection, $filter);
        if (!$doc) return 0;

        if ($this->driver === 'mongodb') {
            // Standard set builder
            if (empty(array_filter(array_keys($update), function($k) { return strpos($k, '$') === 0; }))) {
                $update = ['$set' => $update];
            }
            $bulk = new \MongoDB\Driver\BulkWrite();
            $bulk->update($filter, $update, $options);
            $res = $this->manager->executeBulkWrite("{$this->dbName}.{$collection}", $bulk);
            return $res->getModifiedCount();
        } else {
            // SQLite Update
            $now = date('Y-m-d H:i:s');
            
            // Check for $set wrapper
            if (isset($update['$set'])) {
                $merged = array_merge($doc, $update['$set']);
            } else {
                // If it contains operators like $push, handle them manually
                if (isset($update['$push'])) {
                    foreach ($update['$push'] as $key => $val) {
                        if (!isset($doc[$key]) || !is_array($doc[$key])) {
                            $doc[$key] = [];
                        }
                        $doc[$key][] = $val;
                    }
                    $merged = $doc;
                } else {
                    $merged = array_merge($doc, $update);
                }
            }

            $merged['updatedAt'] = $now;
            unset($merged['_id'], $merged['createdAt']);

            if ($this->driver === 'pgsql') {
                $stmt = $this->pdo->prepare("UPDATE \"{$collection}\" SET \"data\" = :data, \"updatedAt\" = :updated WHERE \"_id\" = :id");
            } else {
                $stmt = $this->pdo->prepare("UPDATE {$collection} SET data = :data, updatedAt = :updated WHERE _id = :id");
            }
            $stmt->execute([
                'data' => json_encode($merged),
                'updated' => $now,
                'id' => $doc['_id']
            ]);
            return 1;
        }
    }

    public function deleteOne($collection, $filter) {
        if ($this->driver === 'mongodb') {
            $filter = $this->convertIdToObjectId($filter);
            $bulk = new \MongoDB\Driver\BulkWrite();
            $bulk->delete($filter, ['limit' => 1]);
            $res = $this->manager->executeBulkWrite("{$this->dbName}.{$collection}", $bulk);
            return $res->getDeletedCount();
        } else {
            $doc = $this->findOne($collection, $filter);
            if (!$doc) return 0;

            if ($this->driver === 'pgsql') {
                $stmt = $this->pdo->prepare("DELETE FROM \"{$collection}\" WHERE \"_id\" = :id");
            } else {
                $stmt = $this->pdo->prepare("DELETE FROM {$collection} WHERE _id = :id");
            }
            $stmt->execute(['id' => $doc['_id']]);
            return 1;
        }
    }

    public function deleteMany($collection, $filter) {
        if ($this->driver === 'mongodb') {
            $filter = $this->convertIdToObjectId($filter);
            $bulk = new \MongoDB\Driver\BulkWrite();
            $bulk->delete($filter, ['limit' => 0]);
            $res = $this->manager->executeBulkWrite("{$this->dbName}.{$collection}", $bulk);
            return $res->getDeletedCount();
        } else {
            $params = [];
            $where = $this->buildWhere($filter, $params, $collection);
            $table = ($this->driver === 'pgsql') ? "\"{$collection}\"" : $collection;
            $stmt = $this->pdo->prepare("DELETE FROM {$table}" . $where);
            foreach ($params as $key => $val) {
                if ($this->driver === 'pgsql') {
                    $type = is_null($val) ? \PDO::PARAM_NULL : \PDO::PARAM_STR;
                    if (is_bool($val)) {
                        $val = $val ? 'true' : 'false';
                    } elseif ($val !== null) {
                        $val = (string)$val;
                    }
                } else {
                    $type = is_int($val) ? \PDO::PARAM_INT : (is_bool($val) ? \PDO::PARAM_BOOL : (is_null($val) ? \PDO::PARAM_NULL : \PDO::PARAM_STR));
                }
                $stmt->bindValue($key, $val, $type);
            }
            $stmt->execute();
            return $stmt->rowCount();
        }
    }

    public function count($collection, $filter = []) {
        if ($this->driver === 'mongodb') {
            $filter = $this->convertIdToObjectId($filter);
            try {
                $cmd = new \MongoDB\Driver\Command([
                    'count' => $collection,
                    'query' => (object)$filter
                ]);
                $cursor = $this->manager->executeCommand($this->dbName, $cmd);
                $res = iterator_to_array($cursor)[0];
                return $res->n ?? 0;
            } catch (\Exception $e) {
                // Fallback to fetch and count
                return count($this->find($collection, $filter));
            }
        } else {
            $params = [];
            $where = $this->buildWhere($filter, $params, $collection);
            $table = ($this->driver === 'pgsql') ? "\"{$collection}\"" : $collection;
            $sql = "SELECT COUNT(*) as cnt FROM {$table}" . $where;
            $stmt = $this->pdo->prepare($sql);
            foreach ($params as $key => $val) {
                if ($this->driver === 'pgsql') {
                    $type = is_null($val) ? \PDO::PARAM_NULL : \PDO::PARAM_STR;
                    if (is_bool($val)) {
                        $val = $val ? 'true' : 'false';
                    } elseif ($val !== null) {
                        $val = (string)$val;
                    }
                } else {
                    $type = is_int($val) ? \PDO::PARAM_INT : (is_bool($val) ? \PDO::PARAM_BOOL : (is_null($val) ? \PDO::PARAM_NULL : \PDO::PARAM_STR));
                }
                $stmt->bindValue($key, $val, $type);
            }
            $stmt->execute();
            $row = $stmt->fetch();
            return $row ? (int)$row['cnt'] : 0;
        }
    }

    public function sumJsonField($collection, $field) {
        if ($this->driver === 'mongodb') {
            try {
                $cmd = new \MongoDB\Driver\Command([
                    'aggregate' => $collection,
                    'pipeline' => [
                        ['$group' => ['_id' => null, 'total' => ['$sum' => '$' . $field]]]
                    ],
                    'cursor' => new \stdClass()
                ]);
                $cursor = $this->manager->executeCommand($this->dbName, $cmd);
                $res = iterator_to_array($cursor)[0] ?? null;
                return $res ? ($res->total ?? 0) : 0;
            } catch (\Exception $e) {
                return 0;
            }
        } else {
            $sqlField = $this->sqlField($field);
            if ($this->driver === 'pgsql') {
                $sql = "SELECT SUM({$sqlField}) as total FROM \"{$collection}\"";
            } else {
                $sql = "SELECT SUM(CAST(coalesce({$sqlField}, 0) AS INTEGER)) as total FROM {$collection}";
            }
            try {
                $stmt = $this->pdo->query($sql);
                $row = $stmt->fetch();
                return $row ? (int)$row['total'] : 0;
            } catch (\Exception $e) {
                return 0;
            }
        }
    }

    // ----------------------------------------------------
    // SEEDING UTILITIES
    // ----------------------------------------------------

    private function seedRolesAndAdmin() {
        if ($this->count('permissions') > 0) {
            return; // Already seeded
        }

        // 1. Seed Permissions
        $permissions = [
            ['name' => 'manage_movies', 'description' => 'Can create, edit, delete movies'],
            ['name' => 'manage_dramas', 'description' => 'Can create, edit, delete dramas/seasons/episodes'],
            ['name' => 'approve_subtitles', 'description' => 'Can moderate subtitle uploads'],
            ['name' => 'manage_comments', 'description' => 'Can moderate reviews and comments'],
            ['name' => 'manage_users', 'description' => 'Can manage front-end user statuses'],
            ['name' => 'view_analytics', 'description' => 'Access to traffic and SEO dashboard'],
            ['name' => 'manage_settings', 'description' => 'Configure API keys and site flags']
        ];

        $pIds = [];
        foreach ($permissions as $p) {
            $inserted = $this->insertOne('permissions', $p);
            $pIds[$p['name']] = $inserted['_id'];
        }

        // 2. Seed Roles
        $superAdminRole = $this->insertOne('roles', [
            'name' => 'SuperAdmin',
            'permissions' => array_values($pIds)
        ]);

        $this->insertOne('roles', [
            'name' => 'Moderator',
            'permissions' => [
                $pIds['approve_subtitles'],
                $pIds['manage_comments'],
                $pIds['view_analytics']
            ]
        ]);

        $this->insertOne('roles', [
            'name' => 'Editor',
            'permissions' => [
                $pIds['manage_movies'],
                $pIds['manage_dramas']
            ]
        ]);

        // 3. Seed SuperAdmin
        $hashedPassword = password_hash('adminpassword123', PASSWORD_BCRYPT);
        $this->insertOne('admins', [
            'username' => 'superadmin',
            'email' => 'admin@ksubzone.com',
            'password' => $hashedPassword,
            'role' => $superAdminRole['_id'],
            'twoFactorEnabled' => false
        ]);

        // 4. Seed Mock Movie and Drama Data
        $this->seedMockMedia();
    }

    private function seedMockMedia() {
        // Genres
        $genres = [
            ['name' => 'Horror', 'slug' => 'horror'],
            ['name' => 'Action', 'slug' => 'action'],
            ['name' => 'Thriller', 'slug' => 'thriller'],
            ['name' => 'Comedy', 'slug' => 'comedy'],
            ['name' => 'Drama', 'slug' => 'drama'],
            ['name' => 'Mystery', 'slug' => 'mystery'],
            ['name' => 'Sci-Fi & Fantasy', 'slug' => 'sci-fi-fantasy']
        ];
        foreach ($genres as $g) {
            $this->insertOne('genres', $g);
        }

        // Train to Busan
        $busan = $this->insertOne('movies', [
            'title' => 'Train to Busan',
            'originalTitle' => '부산행',
            'slug' => 'train-to-busan',
            'description' => 'A zombie virus breaks out in South Korea, and passengers on a train from Seoul to Busan struggle to survive.',
            'poster' => 'https://placehold.co/500x750/111/fff?text=Train+to+Busan',
            'banner' => 'https://placehold.co/1920x1080/111/fff?text=Train+to+Busan+Banner',
            'backdrops' => [],
            'releaseDate' => '2016-07-20',
            'runtime' => 118,
            'country' => 'KR',
            'language' => 'ko',
            'productionCompanies' => ['RedPeter Films'],
            'tmdbRating' => 8.0,
            'imdbRating' => 8.0,
            'trailer' => 'https://www.youtube.com/embed/pyWuHv2-Y8s',
            'keywords' => ['zombie', 'survival', 'train'],
            'director' => 'Yeon Sang-ho',
            'writers' => ['Park Joo-suk'],
            'studio' => 'RedPeter Films',
            'cast' => [
                ['name' => 'Gong Yoo', 'character' => 'Seok-woo', 'profilePath' => ''],
                ['name' => 'Ma Dong-seok', 'character' => 'Sang-hwa', 'profilePath' => '']
            ],
            'viewCount' => 0,
            'status' => 'Published',
            'isFeatured' => true,
            'isTrending' => true,
            'tmdbId' => 555501
        ]);

        // Parasite
        $parasite = $this->insertOne('movies', [
            'title' => 'Parasite',
            'originalTitle' => '기생충',
            'slug' => 'parasite',
            'description' => 'All unemployed, Ki-taek\'s family takes peculiar interest in the wealthy and glamorous Parks for their livelihood.',
            'poster' => 'https://placehold.co/500x750/111/fff?text=Parasite',
            'banner' => 'https://placehold.co/1920x1080/111/fff?text=Parasite+Banner',
            'backdrops' => [],
            'releaseDate' => '2019-05-30',
            'runtime' => 132,
            'country' => 'KR',
            'language' => 'ko',
            'productionCompanies' => ['Barunson E&A'],
            'tmdbRating' => 8.5,
            'imdbRating' => 8.5,
            'trailer' => 'https://www.youtube.com/embed/5xH0HfJHsaY',
            'keywords' => ['class conflict', 'dark comedy'],
            'director' => 'Bong Joon-ho',
            'writers' => ['Bong Joon-ho'],
            'studio' => 'Barunson E&A',
            'cast' => [
                ['name' => 'Song Kang-ho', 'character' => 'Ki-taek', 'profilePath' => ''],
                ['name' => 'Lee Sun-kyun', 'character' => 'Mr. Park', 'profilePath' => '']
            ],
            'viewCount' => 0,
            'status' => 'Published',
            'isFeatured' => false,
            'isTrending' => true,
            'tmdbId' => 555502
        ]);

        // Moving (Drama)
        $moving = $this->insertOne('dramas', [
            'title' => 'Moving',
            'originalTitle' => '무빙',
            'slug' => 'moving',
            'description' => 'Children with superpowers and their parents who harbor painful secrets from the past face a massive imminent danger together.',
            'poster' => 'https://placehold.co/500x750/111/fff?text=Moving',
            'banner' => 'https://placehold.co/1920x1080/111/fff?text=Moving+Banner',
            'backdrops' => [],
            'releaseDate' => '2023-08-09',
            'runtime' => 45,
            'country' => 'KR',
            'language' => 'ko',
            'productionCompanies' => ['Studio Flow'],
            'tmdbRating' => 8.4,
            'imdbRating' => 8.4,
            'trailer' => 'https://www.youtube.com/embed/rP1Zc5b_a6E',
            'keywords' => ['superpowers', 'secret agent', 'action'],
            'director' => 'Park In-je',
            'writers' => ['Kang Full'],
            'studio' => 'Studio Flow',
            'cast' => [
                ['name' => 'Ryu Seung-ryong', 'character' => 'Jang Ju-won', 'profilePath' => ''],
                ['name' => 'Han Hyo-joo', 'character' => 'Lee Mi-hyun', 'profilePath' => '']
            ],
            'viewCount' => 0,
            'status' => 'Published',
            'isFeatured' => true,
            'isTrending' => true,
            'tmdbId' => 999901
        ]);

        // Season 1 of Moving
        $season = $this->insertOne('seasons', [
            'dramaId' => $moving['_id'],
            'seasonNumber' => 1,
            'seasonDescription' => 'Season 1 chronicles the awakening of high schoolers\' abilities and the agents guarding them.',
            'seasonPoster' => 'https://placehold.co/500x750/111/fff?text=Moving+S1',
            'airDate' => '2023-08-09'
        ]);

        // Episode 1 of Moving S1
        $this->insertOne('episodes', [
            'dramaId' => $moving['_id'],
            'seasonId' => $season['_id'],
            'episodeNumber' => 1,
            'episodeTitle' => 'Superpower Senior',
            'episodeDescription' => 'Bong-seok hides his ability to float. A new girl, Hui-soo, transfers to his school.',
            'episodeThumbnail' => 'https://placehold.co/1920x1080/111/fff?text=Moving+E1',
            'airDate' => '2023-08-09',
            'runtime' => 45,
            'videoUrl' => 'https://www.w3schools.com/html/mov_bbb.mp4'
        ]);

        // Episode 2 of Moving S1
        $this->insertOne('episodes', [
            'dramaId' => $moving['_id'],
            'seasonId' => $season['_id'],
            'episodeNumber' => 2,
            'episodeTitle' => 'Han River Euljiro',
            'episodeDescription' => 'A mysterious assassin named Frank begins targeting retired agents with superpowers.',
            'episodeThumbnail' => 'https://placehold.co/1920x1080/111/fff?text=Moving+E2',
            'airDate' => '2023-08-09',
            'runtime' => 48,
            'videoUrl' => 'https://www.w3schools.com/html/mov_bbb.mp4'
        ]);
    }

    private function seedArticles() {
        if ($this->count('articles') > 0) {
            return;
        }

        $defaultArticles = [
            [
                'title' => 'Weak Hero: Why school revenge stories feel so intense',
                'excerpt' => 'A closer look at friendship, pressure, violence, and the quiet emotional rhythm that makes Weak Hero stand out.',
                'content' => "Weak Hero Class 1 is one of the most raw and intense school dramas ever made. Instead of presenting simple schoolyard conflicts, it dives deep into the psychology of pressure, systemic failure, and the desperation that drives ordinary students to violence.\n\nThe series centers around Yeon Shi-eun, a quiet, top-tier student who uses his brain, tools, and understanding of physics to fight back against brutal bullies. What makes this story so compelling is that Shi-eun is not a traditional hero; he is a deeply traumatized kid pushed to his absolute limits.\n\nThroughout the show, we see how the school system and parents ignore the growing danger, forcing the students to form fragile alliances and face dangerous gangs. The intense pacing, realistic choreography, and heavy emotional weight make it a standout masterpiece in the school revenge subgenre.",
                'category' => 'Character Study',
                'coverImage' => 'https://image.tmdb.org/t/p/original/cLTAda6fMRirkCY1xfO4pmcHVkk.jpg',
                'authorName' => 'KSubZone Editorial',
                'readTime' => 5,
                'status' => 'Published',
                'isFeatured' => true,
                'tags' => ['Weak Hero', 'Character Study', 'Action', 'School Drama'],
                'metaTitle' => 'Weak Hero Class 1: Psychology of School Drama',
                'metaDescription' => 'A deep-dive character study into Yeon Shi-eun and the realistic violence of Weak Hero Class 1.',
                'seoKeywords' => ['weak hero class 1', 'yeon shi eun', 'school drama', 'korean revenge series']
            ],
            [
                'title' => 'Best K-Dramas to start with if you are new to Korean series',
                'excerpt' => 'Romance, action, thriller, and slice-of-life picks that help new viewers find their first favorite drama.',
                'content' => "Entering the world of Korean dramas can feel overwhelming with thousands of titles across different genres. To help you navigate, we have curated the ultimate starting guide for beginners.\n\nFor romance lovers, Crash Landing on You is the absolute gold standard. It mixes comedy, political tension, and incredible chemistry in a story about a South Korean heiress who accidentally lands in North Korea.\n\nFor thriller fans, Flower of Evil offers a suspenseful ride about a detective who suspects her seemingly perfect husband might be a serial killer. If you prefer high-intensity action, the superhero series Moving or the zombie survival Train to Busan (movie) are perfect starts.",
                'category' => 'Guide',
                'coverImage' => 'https://image.tmdb.org/t/p/original/8GMFc9ehJk0k6HMpguGN4kMoazl.jpg',
                'authorName' => 'KSubZone Editorial',
                'readTime' => 7,
                'status' => 'Published',
                'isFeatured' => false,
                'tags' => ['Guide', 'Beginner', 'Crash Landing On You', 'Moving'],
                'metaTitle' => 'Ultimate Guide to K-Dramas for Beginners',
                'metaDescription' => 'New to Korean series? Here is the list of best entry point K-dramas across romance, action, and thrillers.',
                'seoKeywords' => ['best kdramas', 'kdrama guide', 'start watching kdramas', 'korean series for beginners']
            ],
            [
                'title' => 'Sinhala subtitles and why timing matters in K-Drama watching',
                'excerpt' => 'Good subtitle timing can change the full mood of a scene, especially in dialogue-heavy Korean dramas.',
                'content' => "Subtitles are the bridge between the story and the viewer. In dialogue-heavy Korean dramas, a delay of even a single second can completely ruin the comedic timing or the dramatic impact of a major revelation.\n\nFor Sri Lankan K-drama fans, community Sinhala subtitles have made these stories highly accessible. However, sync timing is crucial. Since Korean syntax places the verb at the end of the sentence, translators must balance word order with read speed.\n\nProperly synchronized SRT and ASS subtitles ensure that the text appears exactly when the actor speaks, preserving the emotional rhythm and pacing of the director's original cut.",
                'category' => 'Subtitles',
                'coverImage' => 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1600&auto=format&fit=crop',
                'authorName' => 'KSubZone Editorial',
                'readTime' => 4,
                'status' => 'Published',
                'isFeatured' => false,
                'tags' => ['Subtitles', 'Sinhala SRT', 'Sync Timing', 'Watch Guide'],
                'metaTitle' => 'Importance of Sinhala Subtitle Sync in K-Dramas',
                'metaDescription' => 'Why timing and proper translation syntax are essential for enjoying Korean dramas with Sinhala subtitles.',
                'seoKeywords' => ['sinhala subtitles', 'kdrama sinhala sub', 'subtitles sync SRT', 'translation timing']
            ],
            [
                'title' => 'From Train to Busan to Peninsula: Korean zombie cinema explained',
                'excerpt' => 'How Korean zombie movies mix survival action with family, class pressure, and social collapse.',
                'content' => "Korean zombie cinema has taken the global film industry by storm. Films like Train to Busan redefined the genre by shifting the focus from mindless gore to human relationship dynamics and societal critique.\n\nIn Train to Busan, the zombies are fast and aggressive, but the true threat is the breakdown of human morality inside the train cars. The film highlights the conflict between selfish upper-class individuals and working-class people who sacrifice themselves for others.\n\nSubsequent entries like Kingdom and Peninsula expanded this universe, showing how historical settings and post-apocalyptic landscapes can serve as a backdrop for political corruption and human resilience.",
                'category' => 'Movies',
                'coverImage' => 'https://image.tmdb.org/t/p/original/gEjNlhZhyHeto6Fy5wWy5Uk3A9D.jpg',
                'authorName' => 'KSubZone Editorial',
                'readTime' => 6,
                'status' => 'Published',
                'isFeatured' => true,
                'tags' => ['Zombies', 'Train to Busan', 'Movies', 'Kingdom'],
                'metaTitle' => 'Evolution of Korean Zombie Movies & Series',
                'metaDescription' => 'Discover how Korean zombie films blend high-speed action with societal critiques and emotional weight.',
                'seoKeywords' => ['korean zombie movies', 'train to busan', 'kingdom series', 'zombie cinema']
            ],
            [
                'title' => 'Why contract marriage plots still work in modern K-Dramas',
                'excerpt' => 'The familiar trope keeps returning because it creates fast tension, clear stakes, and emotional payoff.',
                'content' => "Contract marriage and fake dating are among the oldest tropes in romance dramas. Yet, modern series like Because This Is My First Life and My Demon continue to pull huge ratings using these exact setups.\n\nWhy does it work so well? First, it establishes immediate proximity. Forcing two completely different people to live together or act as a couple creates organic comedic moments and forced intimacy.\n\nSecond, it sets clear stakes. The characters start with logical reasons to avoid falling in love, making the gradual breakdown of their emotional walls and eventual genuine romance extremely satisfying for viewers.",
                'category' => 'Romance',
                'coverImage' => 'https://image.tmdb.org/t/p/original/6ekykPwvAywJRjFEnUoCFWTO9O3.jpg',
                'authorName' => 'KSubZone Editorial',
                'readTime' => 5,
                'status' => 'Published',
                'isFeatured' => false,
                'tags' => ['Romance', 'Tropes', 'Contract Marriage', 'My Demon'],
                'metaTitle' => 'Contract Marriage Trope in Korean Rom-Coms',
                'metaDescription' => 'An analysis of why the contract marriage plot continues to captivate modern K-drama romance audiences.',
                'seoKeywords' => ['contract marriage kdrama', 'romance tropes', 'fake dating korean series', 'satisfying romance']
            ],
            [
                'title' => 'IMDb ratings vs fan hype: how to choose what to watch next',
                'excerpt' => 'Ratings help, but genre mood, cast chemistry, and episode pacing matter just as much.',
                'content' => "Choosing your next K-drama is often a struggle between objective ratings and community recommendation threads. While platforms like IMDb provide a general baseline, they don't always capture the specific appeal of a series.\n\nMany niche dramas with lower ratings have passionate cult followings due to unique cast chemistry or slice-of-life pacing that doesn't appeal to mainstream audiences. Conversely, some high-rated blockbusters might suffer from generic storylines.\n\nTo build the perfect watchlist, balance reviews with your personal mood, favorite actors, and recommendations from experienced community bloggers rather than just rating numbers.",
                'category' => 'Watchlist',
                'coverImage' => 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?q=80&w=1600&auto=format&fit=crop',
                'authorName' => 'KSubZone Editorial',
                'readTime' => 3,
                'status' => 'Published',
                'isFeatured' => false,
                'tags' => ['Watchlist', 'Guide', 'IMDb', 'Drama Choice'],
                'metaTitle' => 'How to Choose Your Next K-Drama: Ratings vs Hype',
                'metaDescription' => 'Stop struggling to pick a drama. Learn how to balance IMDb scores with your personal genre preferences.',
                'seoKeywords' => ['what to watch next', 'imdb kdrama ratings', 'korean series recommendation', 'watchlist guide']
            ]
        ];

        foreach ($defaultArticles as $art) {
            $art['slug'] = \Utils\Slug::slugify($art['title']);
            $art['viewCount'] = 0;
            $this->insertOne('articles', $art);
        }
    }
}
