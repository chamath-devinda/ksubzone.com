<?php
namespace Controllers;

use Config\Database;
use Utils\Slug;

class TmdbController {
    // Standard mock data mirroring tmdbController.js
    private static $mockData = [
        'movies' => [
            [
                'id' => 555501,
                'title' => "Train to Busan",
                'original_title' => "부산행",
                'overview' => "A zombie virus breaks out in South Korea, and passengers on a train from Seoul to Busan struggle to survive the outbreak.",
                'genres' => [['id' => 27, 'name' => "Horror"], ['id' => 28, 'name' => "Action"], ['id' => 53, 'name' => "Thriller"]],
                'poster_path' => "/v5195.jpg",
                'backdrop_path' => "/b195.jpg",
                'release_date' => "2016-07-20",
                'runtime' => 118,
                'origin_country' => ["KR"],
                'original_language' => "ko",
                'production_companies' => [['name' => "RedPeter Films"], ['name' => "Next Entertainment World"]],
                'vote_average' => 8.0,
                'keywords' => ["zombie", "survival", "train", "father daughter relationship"],
                'trailer' => "https://www.youtube.com/embed/pyWuHv2-Y8s",
                'director' => "Yeon Sang-ho",
                'writers' => ["Park Joo-suk", "Yeon Sang-ho"],
                'cast' => [
                    ['name' => "Gong Yoo", 'character' => "Seok-woo", 'profilePath' => ""],
                    ['name' => "Ma Dong-seok", 'character' => "Sang-hwa", 'profilePath' => ""],
                    ['name' => "Jung Yu-mi", 'character' => "Seong-kyeong", 'profilePath' => ""]
                ],
                'crew' => [['name' => "Yeon Sang-ho", 'job' => "Director"]],
                'images' => [],
                'studio' => "RedPeter Films"
            ],
            [
                'id' => 555502,
                'title' => "Parasite",
                'original_title' => "기생충",
                'overview' => "All unemployed, Ki-taek's family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.",
                'genres' => [['id' => 35, 'name' => "Comedy"], ['id' => 53, 'name' => "Thriller"], ['id' => 18, 'name' => "Drama"]],
                'poster_path' => "/parasite_poster.jpg",
                'backdrop_path' => "/parasite_back.jpg",
                'release_date' => "2019-05-30",
                'runtime' => 132,
                'origin_country' => ["KR"],
                'original_language' => "ko",
                'production_companies' => [['name' => "Barunson E&A"]],
                'vote_average' => 8.5,
                'keywords' => ["social commentary", "class conflict", "dark comedy", "scam"],
                'trailer' => "https://www.youtube.com/embed/5xH0HfJHsaY",
                'director' => "Bong Joon-ho",
                'writers' => ["Bong Joon-ho", "Han Jin-won"],
                'cast' => [
                    ['name' => "Song Kang-ho", 'character' => "Ki-taek", 'profilePath' => ""],
                    ['name' => "Lee Sun-kyun", 'character' => "Mr. Park", 'profilePath' => ""],
                    ['name' => "Cho Yeo-jeong", 'character' => "Mrs. Park", 'profilePath' => ""]
                ],
                'crew' => [['name' => "Bong Joon-ho", 'job' => "Director"]],
                'images' => [],
                'studio' => "Barunson E&A"
            ]
        ],
        'dramas' => [
            [
                'id' => 276161,
                'name' => "Teach You a Lesson",
                'original_name' => "참교육",
                'overview' => "Set in a society where campus violence and the decline of faculty authority have become critical issues, Na Hwa-jin from the Educational Rights Protection Bureau (ERERP) uses unconventional methods to discipline delinquent students and reform the corrupt education system.",
                'genres' => [['id' => 10759, 'name' => "Action & Adventure"], ['id' => 18, 'name' => "Drama"], ['id' => 35, 'name' => "Comedy"]],
                'poster_path' => "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=500&auto=format&fit=crop",
                'backdrop_path' => "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=1280&auto=format&fit=crop",
                'first_air_date' => "2026-06-05",
                'episode_run_time' => [50],
                'origin_country' => ["KR"],
                'original_language' => "ko",
                'production_companies' => [['name' => "Netflix"], ['name' => "Studio N"]],
                'vote_average' => 8.2,
                'keywords' => ["school violence", "corporal punishment", "educational rights", "action"],
                'trailer' => "https://www.youtube.com/embed/dQw4w9WgXcQ",
                'director' => "Hong Jong-chan",
                'writers' => ["Lee Nam-kyu"],
                'cast' => [
                    ['name' => "Kim Mu-yeol", 'character' => "Na Hwa-jin", 'profilePath' => ""],
                    ['name' => "Lee Sung-min", 'character' => "Lim Han-rim", 'profilePath' => ""],
                    ['name' => "Jin Ki-joo", 'character' => "Lee Seok-woo", 'profilePath' => ""]
                ],
                'crew' => [['name' => "Hong Jong-chan", 'job' => "Director"]],
                'images' => [],
                'studio' => "Netflix",
                'seasons' => [
                    [
                        'season_number' => 1,
                        'overview' => "Season 1 follows the agents of the ERPB as they restore order to schools where discipline has failed.",
                        'poster_path' => "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=500&auto=format&fit=crop",
                        'air_date' => "2026-06-05",
                        'episodes' => [
                            ['episode_number' => 1, 'name' => "True Education", 'overview' => "Inspector Na Hwa-jin is dispatched to a high school to deal with a notorious gang of bullies.", 'air_date' => "2026-06-05", 'runtime' => 50],
                            ['episode_number' => 2, 'name' => "The Authority", 'overview' => "Na Hwa-jin confronts administrative corruption and abusive parents trying to cover up school violence.", 'air_date' => "2026-06-05", 'runtime' => 52]
                        ]
                    ]
                ]
            ],
            [
                'id' => 999901,
                'name' => "Moving",
                'original_name' => "무빙",
                'overview' => "Children with superpowers and their parents who harbor painful secrets from the past face a massive imminent danger together.",
                'genres' => [['id' => 10759, 'name' => "Action & Adventure"], ['id' => 18, 'name' => "Drama"], ['id' => 9648, 'name' => "Mystery"]],
                'poster_path' => "/moving_poster.jpg",
                'backdrop_path' => "/moving_back.jpg",
                'first_air_date' => "2023-08-09",
                'episode_run_time' => [45],
                'origin_country' => ["KR"],
                'original_language' => "ko",
                'production_companies' => [['name' => "Studio Flow"], ['name' => "Mr. Romance"]],
                'vote_average' => 8.4,
                'keywords' => ["superpowers", "secret agent", "family", "high school"],
                'trailer' => "https://www.youtube.com/embed/rP1Zc5b_a6E",
                'director' => "Park In-je",
                'writers' => ["Kang Full"],
                'cast' => [
                    ['name' => "Ryu Seung-ryong", 'character' => "Jang Ju-won", 'profilePath' => ""],
                    ['name' => "Han Hyo-joo", 'character' => "Lee Mi-hyun", 'profilePath' => ""],
                    ['name' => "Zo In-sung", 'character' => "Kim Doo-shik", 'profilePath' => ""]
                ],
                'crew' => [['name' => "Park In-je", 'job' => "Director"]],
                'images' => [],
                'studio' => "Studio Flow",
                'seasons' => [
                    [
                        'season_number' => 1,
                        'overview' => "Season 1 chronicles the awakening of high schoolers' abilities and the agents guarding them.",
                        'poster_path' => "/moving_s1_poster.jpg",
                        'air_date' => "2023-08-09",
                        'episodes' => [
                            ['episode_number' => 1, 'name' => "Superpower Senior", 'overview' => "Bong-seok hides his ability to float. A new girl, Hui-soo, transfers to his school.", 'air_date' => "2023-08-09", 'runtime' => 45],
                            ['episode_number' => 2, 'name' => "Han River Euljiro", 'overview' => "A mysterious assassin named Frank begins targeting retired agents with superpowers.", 'air_date' => "2023-08-09", 'runtime' => 48]
                        ]
                    ]
                ]
            ],
            [
                'id' => 999902,
                'name' => "Goblin",
                'original_name' => "쓸쓸하고 찬란하神-도깨비",
                'overview' => "An immortal goblin needs a human bride to end his life. He crosses paths with a grim reaper and a girl who claims she is the goblin's bride.",
                'genres' => [['id' => 18, 'name' => "Drama"], ['id' => 10765, 'name' => "Sci-Fi & Fantasy"]],
                'poster_path' => "/goblin_poster.jpg",
                'backdrop_path' => "/goblin_back.jpg",
                'first_air_date' => "2016-12-02",
                'episode_run_time' => [75],
                'origin_country' => ["KR"],
                'original_language' => "ko",
                'production_companies' => [['name' => "Studio Dragon"]],
                'vote_average' => 8.7,
                'keywords' => ["goblin", "grim reaper", "reincarnation", "immortality", "romance"],
                'trailer' => "https://www.youtube.com/embed/8AcQ-5Fv6Qc",
                'director' => "Lee Eung-bok",
                'writers' => ["Kim Eun-sook"],
                'cast' => [
                    ['name' => "Gong Yoo", 'character' => "Kim Shin (Goblin)", 'profilePath' => ""],
                    ['name' => "Kim Go-eun", 'character' => "Ji Eun-tak", 'profilePath' => ""],
                    ['name' => "Lee Dong-wook", 'character' => "Grim Reaper", 'profilePath' => ""]
                ],
                'crew' => [['name' => "Lee Eung-bok", 'job' => "Director"]],
                'images' => [],
                'studio' => "Studio Dragon",
                'seasons' => [
                    [
                        'season_number' => 1,
                        'overview' => "Follow the romantic and tragic tale of goblin Kim Shin and Eun-tak.",
                        'poster_path' => "/goblin_s1_poster.jpg",
                        'air_date' => "2016-12-02",
                        'episodes' => [
                            ['episode_number' => 1, 'name' => "The Goblin's Bride", 'overview' => "Kim Shin, cursed with immortality, wanders the Earth. Eun-tak summons him accidentally.", 'air_date' => "2016-12-02", 'runtime' => 75]
                        ]
                    ]
                ]
            ]
        ]
    ];

    private static function httpGet($url, $params = []) {
        $queryString = http_build_query($params);
        $fullUrl = $url . ($queryString ? '?' . $queryString : '');

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $fullUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For localhost Dev environments
        
        $response = curl_exec($ch);
        curl_close($ch);
        return json_decode($response, true);
    }

    private static function getTmdbApiKey() {
        if (!empty($_ENV['TMDB_API_KEY'])) {
            return trim($_ENV['TMDB_API_KEY']);
        }
        
        $db = Database::getInstance();
        $setting = $db->findOne('settings', ['key' => ['$in' => ['TMDB_API_KEY', 'tmdb_api_key', 'TMDB_API', 'tmdb_api', 'tmdb'] ] ]);
        if ($setting && !empty($setting['value'])) {
            return trim($setting['value']);
        }
        return '';
    }

    public static function searchTmdb() {
        $query = $_GET['query'] ?? '';
        $type = $_GET['type'] ?? 'movie'; // movie or tv

        if (empty($query)) {
            http_response_code(400);
            echo json_encode(['message' => 'Search query is required']);
            return;
        }

        $apiKey = self::getTmdbApiKey();
        header('Content-Type: application/json');

        if (!empty($apiKey)) {
            $endpoint = ($type === 'tv') ? 'search/tv' : 'search/movie';
            $url = "https://api.themoviedb.org/3/{$endpoint}";
            $res = self::httpGet($url, [
                'api_key' => $apiKey,
                'query' => $query,
                'language' => 'en-US'
            ]);

            $results = [];
            if (isset($res['results'])) {
                foreach ($res['results'] as $item) {
                    $results[] = [
                        'id' => $item['id'],
                        'title' => $item['title'] ?? ($item['name'] ?? ''),
                        'original_title' => $item['original_title'] ?? ($item['original_name'] ?? ''),
                        'overview' => $item['overview'] ?? '',
                        'poster_path' => $item['poster_path'] ?? null,
                        'backdrop_path' => $item['backdrop_path'] ?? null,
                        'release_date' => $item['release_date'] ?? ($item['first_air_date'] ?? null),
                        'vote_average' => $item['vote_average'] ?? 0
                    ];
                }
            }
            echo json_encode($results);
        } else {
            // Mock fallback search
            $store = ($type === 'tv') ? self::$mockData['dramas'] : self::$mockData['movies'];
            $results = [];
            foreach ($store as $item) {
                $title = $item['title'] ?? ($item['name'] ?? '');
                $originalTitle = $item['original_title'] ?? ($item['original_name'] ?? '');
                if (stripos($title, $query) !== false || stripos($originalTitle, $query) !== false) {
                    $results[] = [
                        'id' => $item['id'],
                        'title' => $title,
                        'original_title' => $originalTitle,
                        'overview' => $item['overview'],
                        'poster_path' => $item['poster_path'] ?? null,
                        'backdrop_path' => $item['backdrop_path'] ?? null,
                        'release_date' => $item['release_date'] ?? ($item['first_air_date'] ?? null),
                        'vote_average' => $item['vote_average'],
                        'isMock' => true
                    ];
                }
            }
            echo json_encode($results);
        }
    }

    public static function importFromTmdb() {
        @set_time_limit(240);
        @ini_set('max_execution_time', 240);

        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = $body['id'] ?? null;
        $type = $body['type'] ?? 'movie'; // movie or tv
        $isHistorical = (bool)($body['isHistorical'] ?? false);

        if (!$id) {
            http_response_code(400);
            echo json_encode(['message' => 'TMDB ID is required']);
            return;
        }

        // Run synchronously directly to ensure all seasons and episodes are imported reliably.
        try {
            self::runBackgroundImport($id, $type, $isHistorical);
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Import completed successfully.',
                'status' => 'Completed'
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Import execution failed: ' . $e->getMessage()
            ]);
        }
    }

    private static function findPhpBinary() {
        // 1. Try PHP_BINARY if it exists and is php or php.exe (not httpd, php-cgi, or php-fpm)
        $binary = PHP_BINARY;
        if (!empty($binary) && (stripos($binary, 'php.exe') !== false || (stripos($binary, 'php') !== false && stripos($binary, 'php-cgi') === false && stripos($binary, 'php-fpm') === false && stripos($binary, 'httpd') === false))) {
            return $binary;
        }

        // 2. Try the directory of PHP_BINARY and look for php.exe / php
        if (!empty($binary)) {
            $dir = dirname($binary);
            $ext = (substr(php_uname(), 0, 7) === "Windows") ? '.exe' : '';
            
            // Check direct match
            $candidate = $dir . DIRECTORY_SEPARATOR . 'php' . $ext;
            if (file_exists($candidate)) {
                return $candidate;
            }
            
            // Check sibling bin folder if binary is in sbin (e.g., /usr/sbin/php-fpm -> /usr/bin/php)
            $parent = dirname($dir);
            if (!empty($parent)) {
                $candidate3 = $parent . DIRECTORY_SEPARATOR . 'bin' . DIRECTORY_SEPARATOR . 'php' . $ext;
                if (file_exists($candidate3)) {
                    return $candidate3;
                }
                
                // Check sibling path (e.g. C:\xampp\apache\bin -> C:\xampp\php\php.exe)
                $grandparent = dirname($parent);
                if (!empty($grandparent)) {
                    $candidate2 = $grandparent . DIRECTORY_SEPARATOR . 'php' . DIRECTORY_SEPARATOR . 'php' . $ext;
                    if (file_exists($candidate2)) {
                        return $candidate2;
                    }
                }
            }
        }

        // 3. Search common installation paths on Windows
        if (substr(php_uname(), 0, 7) === "Windows") {
            $commonPaths = [
                'C:\\xampp\\php\\php.exe',
                'D:\\xampp\\php\\php.exe',
                'C:\\Program Files\\PHP\\php.exe',
                'C:\\Program Files (x86)\\PHP\\php.exe',
            ];
            foreach ($commonPaths as $p) {
                if (file_exists($p)) {
                    return $p;
                }
            }
            
            // Laragon detection
            $laragonDir = 'C:\\laragon\\bin\\php';
            if (is_dir($laragonDir)) {
                $subdirs = scandir($laragonDir);
                foreach ($subdirs as $subdir) {
                    if ($subdir === '.' || $subdir === '..') continue;
                    $phpPath = $laragonDir . DIRECTORY_SEPARATOR . $subdir . DIRECTORY_SEPARATOR . 'php.exe';
                    if (file_exists($phpPath)) {
                        return $phpPath;
                    }
                }
            }

            // WampServer detection
            $wampDir = 'C:\\wamp64\\bin\\php';
            if (is_dir($wampDir)) {
                $subdirs = scandir($wampDir);
                foreach ($subdirs as $subdir) {
                    if ($subdir === '.' || $subdir === '..') continue;
                    $phpPath = $wampDir . DIRECTORY_SEPARATOR . $subdir . DIRECTORY_SEPARATOR . 'php.exe';
                    if (file_exists($phpPath)) {
                        return $phpPath;
                    }
                }
            }
        }

        return 'php';
    }

    private static function spawnBackgroundImport($params) {
        $scriptPath = dirname(__FILE__) . '/../scripts/background-import.php';
        $args = base64_encode(json_encode($params));
        $phpBin = self::findPhpBinary();
        $logPath = dirname(__FILE__) . '/../import_error.log';
        
        if (substr(php_uname(), 0, 7) === "Windows") {
            // Windows background execution using popen
            // Note: start /B requires a dummy title if the first argument (command) is quoted.
            $cmd = "start /B \"\" " . escapeshellarg($phpBin) . " " . escapeshellarg($scriptPath) . " " . escapeshellarg($args) . " > " . escapeshellarg($logPath) . " 2>&1";
            pclose(popen($cmd, "r"));
        } else {
            // Linux/cPanel background execution with nohup and redirected stdin to prevent termination
            $cmd = "nohup " . escapeshellarg($phpBin) . " " . escapeshellarg($scriptPath) . " " . escapeshellarg($args) . " < /dev/null > " . escapeshellarg($logPath) . " 2>&1 &";
            exec($cmd);
        }
        error_log("Spawned background import: " . $cmd);
    }

    public static function runBackgroundImport($id, $type, $isHistorical) {
        $apiKey = self::getTmdbApiKey();
        $data = null;
        $title = 'TMDB ID: ' . $id;

        try {
            if (!empty($apiKey)) {
                $endpoint = ($type === 'tv') ? 'tv' : 'movie';
                $url = "https://api.themoviedb.org/3/{$endpoint}/{$id}";
                $data = self::httpGet($url, [
                    'api_key' => $apiKey,
                    'append_to_response' => 'credits,videos,images,keywords'
                ]);

                if (isset($data['success']) && $data['success'] === false) {
                    throw new \Exception('Media not found on TMDB');
                }

                $title = ($type === 'tv') ? ($data['name'] ?? $title) : ($data['title'] ?? $title);

                // Extract keywords
                $keywordsArr = [];
                if (isset($data['keywords']['keywords'])) {
                    foreach ($data['keywords']['keywords'] as $k) {
                        $keywordsArr[] = $k['name'];
                    }
                } elseif (isset($data['keywords']['results'])) {
                    foreach ($data['keywords']['results'] as $k) {
                        $keywordsArr[] = $k['name'];
                    }
                }
                $data['keywords'] = $keywordsArr;

                // Extract trailer URL
                $trailerUrl = '';
                if (isset($data['videos']['results'])) {
                    foreach ($data['videos']['results'] as $v) {
                        if ($v['type'] === 'Trailer' && $v['site'] === 'YouTube') {
                            $trailerUrl = "https://www.youtube.com/embed/{$v['key']}";
                            break;
                        }
                    }
                }
                $data['trailer'] = $trailerUrl;

                // Extract images
                $imgArr = [];
                if (isset($data['images']['backdrops'])) {
                    $backdrops = array_slice($data['images']['backdrops'], 0, 5);
                    foreach ($backdrops as $i) {
                        $imgArr[] = "https://image.tmdb.org/t/p/original" . $i['file_path'];
                    }
                }
                $data['images'] = $imgArr;

                // Fetch seasons if tv
                if ($type === 'tv' && isset($data['seasons'])) {
                    $seasonsFull = [];
                    foreach ($data['seasons'] as $s) {
                        $sNum = isset($s['season_number']) ? (int)$s['season_number'] : 0;
                        if ($sNum === 0) continue; // Skip specials
                        $sUrl = "https://api.themoviedb.org/3/tv/{$id}/season/{$sNum}";
                        $seasonDetails = self::httpGet($sUrl, ['api_key' => $apiKey]);
                        if ($seasonDetails) {
                            $seasonsFull[] = $seasonDetails;
                        } else {
                            error_log("Failed to fetch season details for show {$id} season {$sNum}");
                        }
                    }
                    $data['seasons'] = $seasonsFull;
                }
            } else {
                // Mock Import mapping
                $store = ($type === 'tv') ? self::$mockData['dramas'] : self::$mockData['movies'];
                foreach ($store as $item) {
                    if ((int)$item['id'] === (int)$id) {
                        $data = $item;
                        break;
                    }
                }

                if (!$data) {
                    throw new \Exception('Mock title details not found in fallback database.');
                }

                $title = ($type === 'tv') ? ($data['name'] ?? $title) : ($data['title'] ?? $title);
            }

            if ($type === 'tv') {
                $media = self::processDramaData($data, $isHistorical);
            } else {
                $media = self::processMovieData($data, $isHistorical);
            }

            // Invalidate cache and trigger revalidation
            \Utils\Cache::delete('home_catalog');
            \Utils\Revalidate::path('/');
            if ($media && !empty($media['slug'])) {
                \Utils\Revalidate::media($type === 'tv' ? 'drama' : 'movie', $media['slug']);
            }

            self::logImport($id, $title, $type, $isHistorical, 'Success');

            return $media;
        } catch (\Exception $e) {
            self::logImport($id, $title, $type, $isHistorical, 'Failed');
            throw $e;
        }
    }



    private static function processMovieData($data, $isHistorical = false) {
        $db = Database::getInstance();

        // Save genres
        $genresList = [];
        if (isset($data['genres'])) {
            foreach ($data['genres'] as $g) {
                $genresList[] = $g['name'];
                $existingGenre = $db->findOne('genres', ['name' => $g['name']]);
                if (!$existingGenre) {
                    $db->insertOne('genres', [
                        'name' => $g['name'],
                        'slug' => Slug::slugify($g['name']),
                        'tmdbId' => $g['id']
                    ]);
                }
            }
        }

        $existingMovie = $db->findOne('movies', ['tmdbId' => $data['id']]);
        // Strip trailing year patterns like "Movie Title 2026" or "Movie Title (2026)" from slug
        $slugTitle = preg_replace('/\s*[\(\[]?\d{4}[\)\]]?\s*$/', '', $data['title']);
        $slug = Slug::createUniqueSlug(function($candidate) use ($db) {
            return $db->findOne('movies', ['slug' => $candidate]);
        }, $slugTitle ?: $data['title'], $existingMovie['_id'] ?? null);

        $director = $data['director'] ?? '';
        $writers = $data['writers'] ?? [];
        $cast = [];

        if (empty($director) && isset($data['credits']['crew'])) {
            foreach ($data['credits']['crew'] as $c) {
                if ($c['job'] === 'Director') {
                    $director = $c['name'];
                    break;
                }
            }
        }

        if (empty($writers) && isset($data['credits']['crew'])) {
            foreach ($data['credits']['crew'] as $c) {
                if ($c['department'] === 'Writing') {
                    $writers[] = $c['name'];
                }
            }
        }

        if (isset($data['credits']['cast'])) {
            $rawCast = array_slice($data['credits']['cast'], 0, 10);
            foreach ($rawCast as $c) {
                $cast[] = [
                    'name' => $c['name'],
                    'character' => $c['character'],
                    'profilePath' => $c['profile_path'] ? "https://image.tmdb.org/t/p/w185" . $c['profile_path'] : ''
                ];
            }
        } else {
            $cast = $data['cast'] ?? [];
        }

        $movieDoc = [
            'title' => $data['title'],
            'originalTitle' => $data['original_title'] ?? $data['title'],
            'slug' => $slug,
            'description' => $data['overview'],
            'poster' => !empty($data['poster_path']) ? "https://image.tmdb.org/t/p/w500" . $data['poster_path'] : 'https://placehold.co/500x750/111/fff?text=No+Poster',
            'banner' => !empty($data['backdrop_path']) ? "https://image.tmdb.org/t/p/original" . $data['backdrop_path'] : 'https://placehold.co/1920x1080/111/fff?text=No+Banner',
            'backdrops' => !empty($data['backdrop_path']) ? ["https://image.tmdb.org/t/p/original" . $data['backdrop_path']] : [],
            'releaseDate' => $data['release_date'] ?? null,
            'runtime' => $data['runtime'] ?? 120,
            'country' => isset($data['origin_country'][0]) ? $data['origin_country'][0] : 'KR',
            'language' => $data['original_language'] ?? 'ko',
            'productionCompanies' => array_map(function($c) { return $c['name']; }, $data['production_companies'] ?? []),
            'tmdbRating' => $data['vote_average'] ?? 0,
            'imdbRating' => $data['vote_average'] ?? 0,
            'trailer' => $data['trailer'] ?? '',
            'keywords' => $data['keywords'] ?? [],
            'images' => $data['images'] ?? [],
            'director' => $director,
            'writers' => $writers,
            'studio' => $data['studio'] ?? ($data['production_companies'][0]['name'] ?? 'Unknown Studio'),
            'cast' => $cast,
            'tmdbId' => $data['id'],
            'status' => 'Draft',
            'isHistorical' => $isHistorical
        ];

        // AI SEO content
        $seo = AiSeoController::generateSeoForTitle($movieDoc['title'], $movieDoc['description'], 'Movie', [
            'genres' => $genresList,
            'releaseDate' => $movieDoc['releaseDate'],
            'director' => $movieDoc['director'],
            'cast' => array_map(function($c) { return $c['name']; }, $movieDoc['cast'])
        ]);

        $finalDoc = array_merge($movieDoc, $seo);

        if ($existingMovie) {
            $db->updateOne('movies', ['_id' => $existingMovie['_id']], $finalDoc);
            // Save query round-trip: return merged doc in memory
            $mergedMovie = array_merge($existingMovie, $finalDoc);
            $mergedMovie['updatedAt'] = date('Y-m-d H:i:s');
            return $mergedMovie;
        } else {
            return $db->insertOne('movies', $finalDoc);
        }
    }

    private static function processDramaData($data, $isHistorical = false) {
        $db = Database::getInstance();

        // Save genres
        $genresList = [];
        if (isset($data['genres'])) {
            foreach ($data['genres'] as $g) {
                $genresList[] = $g['name'];
                $existingGenre = $db->findOne('genres', ['name' => $g['name']]);
                if (!$existingGenre) {
                    $db->insertOne('genres', [
                        'name' => $g['name'],
                        'slug' => Slug::slugify($g['name']),
                        'tmdbId' => $g['id']
                    ]);
                }
            }
        }

        $existingDrama = $db->findOne('dramas', ['tmdbId' => $data['id']]);
        // Strip trailing year patterns like "Drama Title 2026" or "Drama Title (2026)" from slug
        $slugTitle = preg_replace('/\s*[\(\[]?\d{4}[\)\]]?\s*$/', '', $data['name']);
        $slug = Slug::createUniqueSlug(function($candidate) use ($db) {
            return $db->findOne('dramas', ['slug' => $candidate]);
        }, $slugTitle ?: $data['name'], $existingDrama['_id'] ?? null);

        $director = $data['director'] ?? '';
        $writers = $data['writers'] ?? [];
        $cast = [];

        if (empty($director) && isset($data['credits']['crew'])) {
            foreach ($data['credits']['crew'] as $c) {
                if ($c['job'] === 'Director') {
                    $director = $c['name'];
                    break;
                }
            }
        }

        if (empty($writers) && isset($data['credits']['crew'])) {
            foreach ($data['credits']['crew'] as $c) {
                if ($c['department'] === 'Writing') {
                    $writers[] = $c['name'];
                }
            }
        }

        if (isset($data['credits']['cast'])) {
            $rawCast = array_slice($data['credits']['cast'], 0, 10);
            foreach ($rawCast as $c) {
                $cast[] = [
                    'name' => $c['name'],
                    'character' => $c['character'],
                    'profilePath' => $c['profile_path'] ? "https://image.tmdb.org/t/p/w185" . $c['profile_path'] : ''
                ];
            }
        } else {
            $cast = $data['cast'] ?? [];
        }

        $dramaDoc = [
            'title' => $data['name'],
            'originalTitle' => $data['original_name'] ?? $data['name'],
            'slug' => $slug,
            'description' => $data['overview'],
            'poster' => !empty($data['poster_path']) ? "https://image.tmdb.org/t/p/w500" . $data['poster_path'] : 'https://placehold.co/500x750/111/fff?text=No+Poster',
            'banner' => !empty($data['backdrop_path']) ? "https://image.tmdb.org/t/p/original" . $data['backdrop_path'] : 'https://placehold.co/1920x1080/111/fff?text=No+Banner',
            'backdrops' => !empty($data['backdrop_path']) ? ["https://image.tmdb.org/t/p/original" . $data['backdrop_path']] : [],
            'releaseDate' => $data['first_air_date'] ?? null,
            'runtime' => isset($data['episode_run_time'][0]) ? $data['episode_run_time'][0] : 60,
            'country' => isset($data['origin_country'][0]) ? $data['origin_country'][0] : 'KR',
            'language' => $data['original_language'] ?? 'ko',
            'productionCompanies' => array_map(function($c) { return $c['name']; }, $data['production_companies'] ?? []),
            'tmdbRating' => $data['vote_average'] ?? 0,
            'imdbRating' => $data['vote_average'] ?? 0,
            'trailer' => $data['trailer'] ?? '',
            'keywords' => $data['keywords'] ?? [],
            'images' => $data['images'] ?? [],
            'director' => $director,
            'writers' => $writers,
            'studio' => $data['studio'] ?? ($data['production_companies'][0]['name'] ?? 'Unknown Studio'),
            'cast' => $cast,
            'tmdbId' => $data['id'],
            'status' => 'Draft',
            'isHistorical' => $isHistorical
        ];

        // AI SEO Content
        $seo = AiSeoController::generateSeoForTitle($dramaDoc['title'], $dramaDoc['description'], 'Drama', [
            'genres' => $genresList,
            'releaseDate' => $dramaDoc['releaseDate'],
            'director' => $dramaDoc['director'],
            'cast' => array_map(function($c) { return $c['name']; }, $dramaDoc['cast'])
        ]);

        $finalDoc = array_merge($dramaDoc, $seo);

        if ($existingDrama) {
            $db->updateOne('dramas', ['_id' => $existingDrama['_id']], $finalDoc);
            // Save query round-trip: merge doc in memory
            $drama = array_merge($existingDrama, $finalDoc);
            $drama['updatedAt'] = date('Y-m-d H:i:s');
        } else {
            $drama = $db->insertOne('dramas', $finalDoc);
        }

        // Handle Seasons & Episodes import
        if (isset($data['seasons']) && is_array($data['seasons'])) {
            // Bulk query existing seasons and episodes for this drama to reduce DB round-trips
            $existingSeasons = $db->find('seasons', ['dramaId' => $drama['_id']]);
            $existingEpisodes = $db->find('episodes', ['dramaId' => $drama['_id']]);

            $seasonMap = [];
            foreach ($existingSeasons as $s) {
                $seasonMap[(int)$s['seasonNumber']] = $s;
            }

            $episodeMap = [];
            foreach ($existingEpisodes as $ep) {
                $key = $ep['seasonId'] . '_' . (int)$ep['episodeNumber'];
                $episodeMap[$key] = $ep;
            }

            foreach ($data['seasons'] as $s) {
                $sNum = isset($s['season_number']) ? (int)$s['season_number'] : 0;
                $seasonDoc = [
                    'dramaId' => $drama['_id'],
                    'seasonNumber' => $sNum,
                    'seasonDescription' => $s['overview'] ?? "Season {$sNum} of {$drama['title']}",
                    'seasonPoster' => $s['poster_path'] ? "https://image.tmdb.org/t/p/w500" . $s['poster_path'] : $drama['poster'],
                    'airDate' => $s['air_date'] ?? null
                ];

                $existingSeason = $seasonMap[$sNum] ?? null;

                if ($existingSeason) {
                    $db->updateOne('seasons', ['_id' => $existingSeason['_id']], $seasonDoc);
                    // Save query round-trip: merge doc in memory
                    $season = array_merge($existingSeason, $seasonDoc);
                    $season['updatedAt'] = date('Y-m-d H:i:s');
                } else {
                    $season = $db->insertOne('seasons', $seasonDoc);
                }

                // Add episodes
                if (isset($s['episodes']) && is_array($s['episodes'])) {
                    foreach ($s['episodes'] as $ep) {
                        $epNum = isset($ep['episode_number']) ? (int)$ep['episode_number'] : 0;
                        $epSchema = [
                            "@context" => "https://schema.org",
                            "@type" => "TVEpisode",
                            "name" => $ep['name'],
                            "episodeNumber" => $epNum,
                            "description" => $ep['overview'] ?? "Episode {$epNum} of {$drama['title']} Season {$sNum}",
                            "datePublished" => $ep['air_date'] ?? null
                        ];

                        $episodeDoc = [
                            'dramaId' => $drama['_id'],
                            'seasonId' => $season['_id'],
                            'episodeNumber' => $epNum,
                            'episodeTitle' => $ep['name'] ?? "Episode {$epNum}",
                            'episodeDescription' => $ep['overview'] ?? "Episode {$epNum} of Season {$sNum}",
                            'episodeThumbnail' => $drama['banner'],
                            'airDate' => $ep['air_date'] ?? null,
                            'runtime' => $ep['runtime'] ?? $drama['runtime'],
                            'videoUrl' => 'https://www.w3schools.com/html/mov_bbb.mp4',
                            'aiEpisodeSummary' => "AI generated recap for {$drama['title']} Episode {$epNum}: " . ($ep['overview'] ?? ''),
                            'episodeSchemaMarkup' => $epSchema
                        ];

                        $epKey = $season['_id'] . '_' . $epNum;
                        $existingEpisode = $episodeMap[$epKey] ?? null;

                        if ($existingEpisode) {
                            $db->updateOne('episodes', ['_id' => $existingEpisode['_id']], $episodeDoc);
                        } else {
                            $db->insertOne('episodes', $episodeDoc);
                        }
                    }
                }
            }
        }

        return $drama;
    }

    public static function discoverKoreanDramas() {
        $source = $_GET['source'] ?? 'popular';
        $page = (int)($_GET['page'] ?? 1);

        $discoverConfigs = [
            'popular' => [
                'label' => 'Popular Korean Dramas',
                'endpoint' => 'discover/tv',
                'params' => [
                    'sort_by' => 'popularity.desc',
                    'with_origin_country' => 'KR',
                    'with_original_language' => 'ko'
                ]
            ],
            'top_rated' => [
                'label' => 'Top Rated Korean Dramas',
                'endpoint' => 'discover/tv',
                'params' => [
                    'sort_by' => 'vote_average.desc',
                    'vote_count_gte' => 80,
                    'with_origin_country' => 'KR',
                    'with_original_language' => 'ko'
                ]
            ],
            'latest' => [
                'label' => 'Latest Korean Dramas',
                'endpoint' => 'discover/tv',
                'params' => [
                    'sort_by' => 'first_air_date.desc',
                    'with_origin_country' => 'KR',
                    'with_original_language' => 'ko'
                ]
            ],
            'trending' => [
                'label' => 'Trending Korean Dramas',
                'endpoint' => 'discover/tv',
                'params' => [
                    'sort_by' => 'popularity.desc',
                    'with_origin_country' => 'KR',
                    'with_original_language' => 'ko',
                    'first_air_date.gte' => date('Y-m-d', strtotime('-365 days'))
                ]
            ],
            'airing' => [
                'label' => 'Currently Airing Korean Dramas',
                'endpoint' => 'discover/tv',
                'params' => [
                    'sort_by' => 'popularity.desc',
                    'with_origin_country' => 'KR',
                    'with_original_language' => 'ko',
                    'air_date.gte' => date('Y-m-d', strtotime('-14 days')),
                    'air_date.lte' => date('Y-m-d', strtotime('+14 days'))
                ]
            ]
        ];

        $config = $discoverConfigs[$source] ?? $discoverConfigs['popular'];
        $apiKey = self::getTmdbApiKey();
        header('Content-Type: application/json');

        if (empty($apiKey)) {
            // Mock fallback
            $results = [];
            foreach (self::$mockData['dramas'] as $item) {
                $results[] = [
                    'id' => $item['id'],
                    'title' => $item['name'],
                    'original_title' => $item['original_name'],
                    'overview' => $item['overview'],
                    'poster_path' => $item['poster_path'],
                    'backdrop_path' => $item['backdrop_path'],
                    'release_date' => $item['first_air_date'],
                    'vote_average' => $item['vote_average'],
                    'media_type' => 'tv',
                    'source' => 'TMDB',
                    'isMock' => true
                ];
            }

            echo json_encode([
                'source' => $source,
                'label' => $config['label'] . ' (Mock fallback)',
                'page' => 1,
                'totalPages' => 1,
                'results' => $results
            ]);
            return;
        }

        $params = array_merge([
            'api_key' => $apiKey,
            'language' => 'en-US',
            'page' => $page
        ], $config['params']);

        if ($source === 'latest') {
            $params['first_air_date.lte'] = date('Y-m-d');
        }

        $url = "https://api.themoviedb.org/3/{$config['endpoint']}";
        $res = self::httpGet($url, $params);
        $results = $res['results'] ?? [];

        // Filter trending/airing for Korean dramas specifically
        if (in_array($source, ['trending', 'airing'])) {
            $filtered = [];
            foreach ($results as $item) {
                $originCountry = $item['origin_country'] ?? [];
                $originalLanguage = $item['original_language'] ?? '';
                if (in_array('KR', $originCountry) || $originalLanguage === 'ko') {
                    $filtered[] = $item;
                }
            }
            $results = $filtered;
        }

        $normalized = [];
        foreach ($results as $item) {
            $normalized[] = [
                'id' => $item['id'],
                'title' => $item['title'] ?? ($item['name'] ?? ''),
                'original_title' => $item['original_title'] ?? ($item['original_name'] ?? ''),
                'overview' => $item['overview'] ?? '',
                'poster_path' => $item['poster_path'] ?? null,
                'backdrop_path' => $item['backdrop_path'] ?? null,
                'release_date' => $item['release_date'] ?? ($item['first_air_date'] ?? null),
                'vote_average' => $item['vote_average'] ?? 0,
                'media_type' => 'tv',
                'source' => 'TMDB'
            ];
        }

        echo json_encode([
            'source' => $source,
            'label' => $config['label'],
            'page' => $res['page'] ?? $page,
            'totalPages' => $res['total_pages'] ?? 1,
            'results' => $normalized
        ]);
    }

    public static function bulkImportFromTmdb() {
        @set_time_limit(240);
        @ini_set('max_execution_time', 240);

        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $ids = $body['ids'] ?? [];
        $type = $body['type'] ?? 'tv'; // movie or tv
        $isHistorical = (bool)($body['isHistorical'] ?? false);

        $uniqueIds = array_slice(array_filter(array_unique(array_map('intval', $ids))), 0, 20);

        if (empty($uniqueIds)) {
            http_response_code(400);
            echo json_encode(['message' => 'Select at least one TMDB title to import']);
            return;
        }

        // Check if background execution is possible
        $canRunBackground = true;
        if (substr(php_uname(), 0, 7) !== "Windows") {
            $disabledFunctions = explode(',', ini_get('disable_functions') ?: '');
            $disabledFunctions = array_map('trim', $disabledFunctions);
            if (in_array('exec', $disabledFunctions) || !function_exists('exec')) {
                $canRunBackground = false;
            }
        } else {
            $disabledFunctions = explode(',', ini_get('disable_functions') ?: '');
            $disabledFunctions = array_map('trim', $disabledFunctions);
            if (in_array('popen', $disabledFunctions) || !function_exists('popen')) {
                $canRunBackground = false;
            }
        }

        if ($canRunBackground) {
            self::spawnBackgroundImport([
                'action' => 'bulk-import',
                'ids' => $uniqueIds,
                'type' => $type,
                'isHistorical' => $isHistorical
            ]);

            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Bulk import task has been started in the background for ' . count($uniqueIds) . ' titles. Refresh drafts in a few moments.',
                'status' => 'Importing'
            ]);
        } else {
            // Run synchronously as fallback (limit to 5 to avoid php timeout)
            $limitedIds = array_slice($uniqueIds, 0, 5);
            $successCount = 0;
            $errors = [];
            foreach ($limitedIds as $titleId) {
                try {
                    self::runBackgroundImport($titleId, $type, $isHistorical);
                    $successCount++;
                } catch (\Exception $e) {
                    $errors[] = "ID {$titleId}: " . $e->getMessage();
                }
            }

            header('Content-Type: application/json');
            echo json_encode([
                'message' => "Bulk import completed. Successfully imported {$successCount} of " . count($limitedIds) . " titles (synchronous fallback).",
                'errors' => $errors,
                'status' => 'Completed'
            ]);
        }
    }

    private static function logImport($id, $title, $type, $isHistorical, $status) {
        try {
            $db = Database::getInstance();
            $db->insertOne('tmdb_imports', [
                'tmdbId' => (int)$id,
                'title' => $title,
                'type' => $type,
                'isHistorical' => (bool)$isHistorical,
                'status' => $status
            ]);
        } catch (\Exception $e) {
            // Silence log errors
        }
    }

    public static function getImportHistory() {
        header('Content-Type: application/json');
        try {
            $db = Database::getInstance();
            $history = $db->find('tmdb_imports', [], ['limit' => 20]);
            echo json_encode($history ?: []);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Failed to load import history: ' . $e->getMessage()]);
        }
    }
}
