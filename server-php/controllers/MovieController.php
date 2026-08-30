<?php
namespace Controllers;

use Config\Database;
use Utils\Slug;
use Utils\MediaPayload;

class MovieController {
    public static function getSearchSuggestions() {
        $query = trim($_GET['q'] ?? '');
        $limit = max(1, min((int)($_GET['limit'] ?? 6), 10));

        if (strlen($query) < 2) {
            header('Content-Type: application/json');
            echo json_encode(['suggestions' => []]);
            return;
        }

        $cacheKey = 'media_search_suggestions_v1_' . md5(strtolower($query) . '_' . $limit);
        $cached = \Utils\Cache::get($cacheKey);
        if ($cached !== false) {
            header('Content-Type: application/json');
            echo json_encode($cached);
            return;
        }

        $db = Database::getInstance();
        $pattern = '.*' . preg_quote($query, '/') . '.*';
        $filter = [
            'status' => ['$in' => ['Published', 'Upcoming']],
            '$or' => [
                ['title' => ['$regex' => $pattern, '$options' => 'i']],
                ['originalTitle' => ['$regex' => $pattern, '$options' => 'i']]
            ]
        ];
        $fetchLimit = min(max($limit, 4), 10);
        $options = [
            'sort' => ['contentUpdatedAt' => -1, 'createdAt' => -1],
            'limit' => $fetchLimit
        ];

        // Autocomplete only needs the two catalog lookups. It intentionally
        // skips subtitle summaries, counts, related records, and user data.
        $movies = $db->find('movies', $filter, $options);
        $dramas = $db->find('dramas', $filter, $options);

        $toSuggestion = function($item, $type) {
            return [
                '_id' => $item['_id'],
                'title' => $item['title'] ?? '',
                'originalTitle' => $item['originalTitle'] ?? '',
                'slug' => $item['slug'] ?? '',
                'poster' => $item['poster'] ?? '',
                'images' => $item['images'] ?? [],
                'releaseDate' => $item['releaseDate'] ?? null,
                'contentUpdatedAt' => $item['contentUpdatedAt'] ?? $item['createdAt'] ?? null,
                'type' => $type
            ];
        };

        $suggestions = [];
        foreach ($movies as $movie) $suggestions[] = $toSuggestion($movie, 'movie');
        foreach ($dramas as $drama) $suggestions[] = $toSuggestion($drama, 'drama');

        $needle = strtolower($query);
        usort($suggestions, function($a, $b) use ($needle) {
            $score = function($item) use ($needle) {
                $title = strtolower($item['title'] ?? '');
                $originalTitle = strtolower($item['originalTitle'] ?? '');
                if ($title === $needle) return 0;
                if (strpos($title, $needle) === 0) return 1;
                if (strpos($title, $needle) !== false) return 2;
                if (strpos($originalTitle, $needle) === 0) return 3;
                return 4;
            };

            $scoreDiff = $score($a) <=> $score($b);
            if ($scoreDiff !== 0) return $scoreDiff;

            $aTime = strtotime($a['contentUpdatedAt'] ?? '') ?: 0;
            $bTime = strtotime($b['contentUpdatedAt'] ?? '') ?: 0;
            return $bTime <=> $aTime;
        });

        $payload = ['suggestions' => array_slice($suggestions, 0, $limit)];
        \Utils\Cache::set($cacheKey, $payload, 600);

        header('Content-Type: application/json');
        echo json_encode($payload);
    }

    public static function getAllMovies() {
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 12);
        $search = $_GET['search'] ?? null;
        $genre = $_GET['genre'] ?? null;
        $year = $_GET['year'] ?? null;
        $country = $_GET['country'] ?? null;
        $language = $_GET['language'] ?? null;
        $rating = $_GET['rating'] ?? null;
        $sort = $_GET['sort'] ?? null;
        $status = $_GET['status'] ?? null;
        $trending = $_GET['trending'] ?? null;
        $isHistorical = $_GET['isHistorical'] ?? null;

        // Public catalog data is session-independent. Admin management has a
        // dedicated endpoint, so no auth lookup or draft data is needed here.
        $filter = [];
        $filter['status'] = in_array($status, ['Published', 'Upcoming'], true)
            ? $status
            : ['$in' => ['Published', 'Upcoming']];

        if ($isHistorical === 'true') {
            $filter['isHistorical'] = true;
        }

        if (!empty($search)) {
            $filter['$text'] = ['$search' => $search];
        }

        if (!empty($genre)) {
            $dbInstance = Database::getInstance();
            $genreObj = $dbInstance->findOne('genres', ['slug' => $genre]);
            $genreName = $genreObj ? $genreObj['name'] : $genre;
            $filter['keywords'] = ['$in' => [$genreName]];
        }

        if (!empty($year)) {
            $filter['releaseDate'] = [
                '$gte' => "{$year}-01-01 00:00:00",
                '$lte' => "{$year}-12-31 23:59:59"
            ];
        }

        if (!empty($country)) {
            $filter['country'] = $country;
        }

        if (!empty($language)) {
            $filter['language'] = $language;
        }

        if ($trending === 'true') {
            // Trending is now calculated by views automatically rather than a manual filter flag
            $sort = 'views';
        }

        if (!empty($rating)) {
            $filter['imdbRating'] = ['$gte' => (float)$rating];
        }

        $sortOptions = ['contentUpdatedAt' => -1, 'createdAt' => -1];
        if ($sort === 'oldest') {
            $sortOptions = ['releaseDate' => 1];
        } elseif ($sort === 'newest') {
            $sortOptions = ['contentUpdatedAt' => -1, 'createdAt' => -1];
        } elseif ($sort === 'rating') {
            $sortOptions = ['imdbRating' => -1, 'tmdbRating' => -1];
        } elseif ($sort === 'popular' || $sort === 'views') {
            $sortOptions = ['viewCount' => -1];
        } elseif ($sort === 'az') {
            $sortOptions = ['title' => 1];
        }

        $skip = ($page - 1) * $limit;

        // Caching layer for search queries
        $cacheKey = "search_movies_v2_" . md5(json_encode($_GET));
        $cached = \Utils\Cache::get($cacheKey);
        if ($cached !== false) {
            header('Content-Type: application/json');
            echo json_encode($cached);
            return;
        }

        $db = Database::getInstance();
        $total = $db->count('movies', $filter);
        $movies = $db->find('movies', $filter, [
            'sort' => $sortOptions,
            'limit' => $limit,
            'skip' => $skip,
            'excludeFields' => MediaPayload::detailOnlyFields()
        ]);

        self::appendMetadataToMovies($movies);
        $movies = MediaPayload::compactMany($movies);

        $payload = [
            'total' => $total,
            'page' => $page,
            'totalPages' => ceil($total / $limit),
            'movies' => $movies
        ];

        // Cache search results for 10 minutes (600 seconds)
        \Utils\Cache::set($cacheKey, $payload, 600);

        header('Content-Type: application/json');
        echo json_encode($payload);
    }

    public static function getHomeCatalog() {
        // Cache layer
        $cachedCatalog = \Utils\Cache::get('home_catalog_v5');
        if ($cachedCatalog !== false) {
            header('Content-Type: application/json');
            echo json_encode($cachedCatalog);
            return;
        }

        $db = Database::getInstance();
        $statusFilter = ['status' => 'Published'];
        $heroExcludes = MediaPayload::detailOnlyFields(true);
        $cardExcludes = MediaPayload::detailOnlyFields();

        // 1. Latest movies by media/subtitle import activity
        $latestMovies = $db->find('movies', $statusFilter, ['sort' => ['contentUpdatedAt' => -1, 'createdAt' => -1], 'limit' => 12, 'excludeFields' => $heroExcludes]);
        
        // 2. Latest dramas by media/subtitle import activity
        $latestDramas = $db->find('dramas', $statusFilter, ['sort' => ['contentUpdatedAt' => -1, 'createdAt' => -1], 'limit' => 40, 'excludeFields' => $heroExcludes]);
        
        // 3. Historical movies (status: Published, isHistorical: true, sort: imdbRating DESC, limit 12)
        $historicalMovies = $db->find('movies', array_merge($statusFilter, ['isHistorical' => true]), ['sort' => ['imdbRating' => -1], 'limit' => 12, 'excludeFields' => $cardExcludes]);
        
        // 4. Historical dramas (status: Published, isHistorical: true, sort: imdbRating DESC, limit 12)
        $historicalDramas = $db->find('dramas', array_merge($statusFilter, ['isHistorical' => true]), ['sort' => ['imdbRating' => -1], 'limit' => 12, 'excludeFields' => $cardExcludes]);
        
        // 5. Trending movies (status: Published, sort: viewCount DESC, limit 12)
        $trendingMovies = $db->find('movies', $statusFilter, ['sort' => ['viewCount' => -1], 'limit' => 12, 'excludeFields' => $cardExcludes]);
        
        // 6. Trending dramas (status: Published, sort: viewCount DESC, limit 12)
        $trendingDramas = $db->find('dramas', $statusFilter, ['sort' => ['viewCount' => -1], 'limit' => 12, 'excludeFields' => $cardExcludes]);
        
        // Popular and trending use the same view-count ranking. Reuse these
        // records instead of issuing two duplicate remote database queries.
        $popularMovies = $trendingMovies;
        $popularDramas = $trendingDramas;

        // 9. Upcoming movies (status: Upcoming, sort: releaseDate ASC, limit 12)
        $upcomingMovies = $db->find('movies', ['status' => 'Upcoming'], ['sort' => ['releaseDate' => 1], 'limit' => 12, 'excludeFields' => $cardExcludes]);

        // 10. Upcoming dramas (status: Upcoming, sort: releaseDate ASC, limit 12)
        $upcomingDramas = $db->find('dramas', ['status' => 'Upcoming'], ['sort' => ['releaseDate' => 1], 'limit' => 12, 'excludeFields' => $cardExcludes]);

        // Batch append subtitle summaries to all fetched drama lists
        $allDramas = [];
        foreach ($latestDramas as $d) { $allDramas[$d['_id']] = $d; }
        foreach ($historicalDramas as $d) { $allDramas[$d['_id']] = $d; }
        foreach ($trendingDramas as $d) { $allDramas[$d['_id']] = $d; }
        foreach ($popularDramas as $d) { $allDramas[$d['_id']] = $d; }
        foreach ($upcomingDramas as $d) { $allDramas[$d['_id']] = $d; }
        
        $allDramasArray = array_values($allDramas);
        DramaController::appendSubtitleSummariesToDramas($allDramasArray);
        
        $dramaMetadata = [];
        foreach ($allDramasArray as $d) {
            $dramaMetadata[$d['_id']] = [
                'isNew' => $d['isNew'] ?? false,
                'subtitleSummary' => $d['subtitleSummary'],
                'contentUpdatedAt' => $d['contentUpdatedAt'] ?? $d['createdAt'] ?? null
            ];
        }
        
        foreach ($latestDramas as &$d) {
            $d['isNew'] = $dramaMetadata[$d['_id']]['isNew'];
            $d['subtitleSummary'] = $dramaMetadata[$d['_id']]['subtitleSummary'];
            $d['contentUpdatedAt'] = $dramaMetadata[$d['_id']]['contentUpdatedAt'];
        }
        unset($d);

        // Keep ongoing titles first and completed titles second. Inside each
        // status group, the latest media/subtitle import activity wins. The
        // visual "New" badge must never override the actual update clock.
        usort($latestDramas, function($a, $b) {
            $aOngoing = strtolower((string)($a['subtitleSummary']['seasonStatus'] ?? '')) === 'ongoing';
            $bOngoing = strtolower((string)($b['subtitleSummary']['seasonStatus'] ?? '')) === 'ongoing';

            if ($aOngoing !== $bOngoing) {
                return $aOngoing ? -1 : 1;
            }

            $aTime = strtotime($a['contentUpdatedAt'] ?? $a['createdAt'] ?? '') ?: 0;
            $bTime = strtotime($b['contentUpdatedAt'] ?? $b['createdAt'] ?? '') ?: 0;
            return $bTime <=> $aTime;
        });

        // Slice to the requested limit of 12 for the homepage updates
        $latestDramas = array_slice($latestDramas, 0, 12);
        foreach ($historicalDramas as &$d) {
            $d['isNew'] = $dramaMetadata[$d['_id']]['isNew'];
            $d['subtitleSummary'] = $dramaMetadata[$d['_id']]['subtitleSummary'];
            $d['contentUpdatedAt'] = $dramaMetadata[$d['_id']]['contentUpdatedAt'];
        }
        unset($d);
        foreach ($trendingDramas as &$d) {
            $d['isNew'] = $dramaMetadata[$d['_id']]['isNew'];
            $d['subtitleSummary'] = $dramaMetadata[$d['_id']]['subtitleSummary'];
            $d['contentUpdatedAt'] = $dramaMetadata[$d['_id']]['contentUpdatedAt'];
        }
        unset($d);
        foreach ($popularDramas as &$d) {
            $d['isNew'] = $dramaMetadata[$d['_id']]['isNew'];
            $d['subtitleSummary'] = $dramaMetadata[$d['_id']]['subtitleSummary'];
            $d['contentUpdatedAt'] = $dramaMetadata[$d['_id']]['contentUpdatedAt'];
        }
        unset($d);
        foreach ($upcomingDramas as &$d) {
            $d['isNew'] = $dramaMetadata[$d['_id']]['isNew'];
            $d['subtitleSummary'] = $dramaMetadata[$d['_id']]['subtitleSummary'];
            $d['contentUpdatedAt'] = $dramaMetadata[$d['_id']]['contentUpdatedAt'];
        }
        unset($d);

        // Batch append metadata to all fetched movie lists
        $allMovies = [];
        foreach ($latestMovies as $m) { $allMovies[$m['_id']] = $m; }
        foreach ($historicalMovies as $m) { $allMovies[$m['_id']] = $m; }
        foreach ($trendingMovies as $m) { $allMovies[$m['_id']] = $m; }
        foreach ($popularMovies as $m) { $allMovies[$m['_id']] = $m; }
        foreach ($upcomingMovies as $m) { $allMovies[$m['_id']] = $m; }
        
        $allMoviesArray = array_values($allMovies);
        self::appendMetadataToMovies($allMoviesArray);
        
        $movieMetadata = [];
        foreach ($allMoviesArray as $m) {
            $movieMetadata[$m['_id']] = [
                'isNew' => $m['isNew'],
                'subtitleCount' => $m['subtitleCount'],
                'subtitleSummary' => $m['subtitleSummary'],
                'contentUpdatedAt' => $m['contentUpdatedAt'] ?? $m['createdAt'] ?? null
            ];
        }
        
        foreach ($latestMovies as &$m) {
            $m['isNew'] = $movieMetadata[$m['_id']]['isNew'];
            $m['subtitleCount'] = $movieMetadata[$m['_id']]['subtitleCount'];
            $m['subtitleSummary'] = $movieMetadata[$m['_id']]['subtitleSummary'];
            $m['contentUpdatedAt'] = $movieMetadata[$m['_id']]['contentUpdatedAt'];
        }
        unset($m);
        foreach ($historicalMovies as &$m) {
            $m['isNew'] = $movieMetadata[$m['_id']]['isNew'];
            $m['subtitleCount'] = $movieMetadata[$m['_id']]['subtitleCount'];
            $m['subtitleSummary'] = $movieMetadata[$m['_id']]['subtitleSummary'];
            $m['contentUpdatedAt'] = $movieMetadata[$m['_id']]['contentUpdatedAt'];
        }
        unset($m);
        foreach ($trendingMovies as &$m) {
            $m['isNew'] = $movieMetadata[$m['_id']]['isNew'];
            $m['subtitleCount'] = $movieMetadata[$m['_id']]['subtitleCount'];
            $m['subtitleSummary'] = $movieMetadata[$m['_id']]['subtitleSummary'];
            $m['contentUpdatedAt'] = $movieMetadata[$m['_id']]['contentUpdatedAt'];
        }
        unset($m);
        foreach ($popularMovies as &$m) {
            $m['isNew'] = $movieMetadata[$m['_id']]['isNew'];
            $m['subtitleCount'] = $movieMetadata[$m['_id']]['subtitleCount'];
            $m['subtitleSummary'] = $movieMetadata[$m['_id']]['subtitleSummary'];
            $m['contentUpdatedAt'] = $movieMetadata[$m['_id']]['contentUpdatedAt'];
        }
        unset($m);
        foreach ($upcomingMovies as &$m) {
            $m['isNew'] = $movieMetadata[$m['_id']]['isNew'];
            $m['subtitleCount'] = $movieMetadata[$m['_id']]['subtitleCount'];
            $m['subtitleSummary'] = $movieMetadata[$m['_id']]['subtitleSummary'];
            $m['contentUpdatedAt'] = $movieMetadata[$m['_id']]['contentUpdatedAt'];
        }
        unset($m);

        $catalogData = [
            'latestMovies' => MediaPayload::compactMany($latestMovies, true),
            'latestDramas' => MediaPayload::compactMany($latestDramas, true),
            'historicalMovies' => MediaPayload::compactMany($historicalMovies),
            'historicalDramas' => MediaPayload::compactMany($historicalDramas),
            'trendingMovies' => MediaPayload::compactMany($trendingMovies),
            'trendingDramas' => MediaPayload::compactMany($trendingDramas),
            // Retain the response keys for older clients. Both rankings have
            // identical semantics, so the frontend reuses trending records.
            'popularMovies' => [],
            'popularDramas' => [],
            'upcomingMovies' => MediaPayload::compactMany($upcomingMovies),
            'upcomingDramas' => MediaPayload::compactMany($upcomingDramas)
        ];

        // Cache for 2 hours (7200 seconds)
        \Utils\Cache::set('home_catalog_v5', $catalogData, 7200);

        header('Content-Type: application/json');
        echo json_encode($catalogData);
    }


    public static function getMovieBySlug($slug) {
        $db = Database::getInstance();
        
        // Match exact slug and legacy links that stripped unique numeric suffixes.
        $movie = Slug::findByPermalinkSlug($db, 'movies', $slug);
        if (!$movie) {
            http_response_code(404);
            echo json_encode(['message' => 'Movie not found']);
            return;
        }

        $mStatus = $movie['status'] ?? 'Published';
        if ($mStatus !== 'Published' && $mStatus !== 'Upcoming' && !\Middleware\AuthMiddleware::isAdmin()) {
            http_response_code(404);
            echo json_encode(['message' => 'Movie not found']);
            return;
        }

        // Caching layer
        $cacheKey = "movie_detail_" . $movie['_id'];
        $cached = \Utils\Cache::get($cacheKey);
        if ($cached !== false) {
            // Background view increment — only count unique visitors once per day
            try {
                if (\Utils\VisitorGuard::shouldCount((string)$movie['_id'])) {
                    $views = ($movie['viewCount'] ?? 0) + 1;
                    $db->updateOne('movies', ['_id' => $movie['_id']], ['viewCount' => $views]);
                }
            } catch (\Exception $e) {
                // Ignore view count write-lock errors to keep page load stable
            }

            header('Content-Type: application/json');
            echo json_encode($cached);
            return;
        }

        // Increment views — only count unique visitors once per day
        try {
            if (\Utils\VisitorGuard::shouldCount((string)$movie['_id'])) {
                $views = ($movie['viewCount'] ?? 0) + 1;
                $db->updateOne('movies', ['_id' => $movie['_id']], ['viewCount' => $views]);
                $movie['viewCount'] = $views;
            }
        } catch (\Exception $e) {
            // Ignore view count write-lock errors to keep page load stable
        }

        // Fetch related movies (excluding current movie, sharing similar keywords)
        $related = [];
        if (!empty($movie['keywords'])) {
            $related = $db->find('movies', [
                '_id' => ['$ne' => $movie['_id']],
                'keywords' => ['$in' => $movie['keywords']]
            ], ['limit' => 4, 'excludeFields' => MediaPayload::detailOnlyFields()]);
        }

        // Append metadata (isNew & subtitleCount) to main movie and related movies
        $moviesArr = [&$movie];
        self::appendMetadataToMovies($moviesArr);
        if (!empty($related)) {
            self::appendMetadataToMovies($related);
            $related = MediaPayload::compactMany($related);
        }

        // Fetch standalone subtitles with batch populating
        $subtitles = \Controllers\SubtitleController::fetchSubtitlesForMediaWithBatchPopulate($movie['_id']);

        // Fetch comments with batch populating
        $comments = \Controllers\CommentController::fetchCommentsForTargetWithBatchPopulate($movie['_id']);

        $payload = [
            'movie' => $movie,
            'related' => $related,
            'subtitles' => $subtitles,
            'comments' => $comments
        ];

        // Cache details payload for 1 hour (3600 seconds)
        \Utils\Cache::set($cacheKey, $payload, 3600);

        header('Content-Type: application/json');
        echo json_encode($payload);
    }

    public static function createMovie() {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        if (empty($data['title'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Movie Title is required']);
            return;
        }

        $db = Database::getInstance();

        // Generate unique slug
        $data['slug'] = Slug::createUniqueSlug(function($candidate) use ($db) {
            return $db->findOne('movies', ['slug' => $candidate]);
        }, $data['title']);
        $data['contentUpdatedAt'] = gmdate(DATE_ATOM);

        // Generate AI SEO package
        $seoContent = AiSeoController::generateSeoForTitle($data['title'], $data['description'] ?? '', 'Movie', [
            'genres' => $data['keywords'] ?? [],
            'releaseDate' => $data['releaseDate'] ?? null,
            'director' => $data['director'] ?? '',
            'cast' => array_map(function($c) { return is_array($c) ? ($c['name'] ?? '') : (is_string($c) ? $c : ''); }, $data['cast'] ?? [])
        ]);

        $finalMovieData = array_merge($data, $seoContent);
        $inserted = $db->insertOne('movies', $finalMovieData);

        // Invalidate cache and trigger revalidation
        \Utils\Cache::flush();
        if ($inserted && !empty($inserted['_id'])) {
            \Utils\Cache::delete("movie_detail_" . $inserted['_id']);
        }
        \Utils\Revalidate::path('/');
        if ($inserted && !empty($inserted['slug'])) {
            \Utils\Revalidate::media('movie', $inserted['slug']);
        }

        http_response_code(201);
        echo json_encode(['message' => 'Movie created successfully', 'movie' => $inserted]);
    }

    public static function updateMovie($id) {
        $updates = json_decode(file_get_contents('php://input'), true) ?: [];
        $db = Database::getInstance();

        $movie = $db->findOne('movies', ['_id' => $id]);
        if (!$movie) {
            http_response_code(404);
            echo json_encode(['message' => 'Movie not found']);
            return;
        }

        // Re-generate SEO package only when title or description has actually changed
        $incomingTitle = $updates['title'] ?? '';
        $incomingDesc  = $updates['description'] ?? '';
        $titleChanged  = !empty($incomingTitle) && $incomingTitle !== ($movie['title'] ?? '');
        $descChanged   = !empty($incomingDesc)  && $incomingDesc  !== ($movie['description'] ?? '');

        if ($titleChanged || $descChanged) {
            $title = $incomingTitle ?: $movie['title'];
            $desc  = $incomingDesc  ?: ($movie['description'] ?? '');
            $seoContent = AiSeoController::generateSeoForTitle($title, $desc, 'Movie', [
                'genres'      => $updates['keywords']    ?? $movie['keywords']    ?? [],
                'releaseDate' => $updates['releaseDate'] ?? $movie['releaseDate'] ?? null,
                'director'    => $updates['director']    ?? $movie['director']    ?? '',
                'cast'        => array_map(function($c) {
                    return is_array($c) ? ($c['name'] ?? '') : (is_string($c) ? $c : '');
                }, $updates['cast'] ?? $movie['cast'] ?? [])
            ]);
            $updates = array_merge($updates, $seoContent);
        }

        try {
            $db->updateOne('movies', ['_id' => $id], $updates);
        } catch (\Exception $e) {
            error_log('MovieController::updateMovie DB error for ID ' . $id . ': ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Database error while saving movie: ' . $e->getMessage()]);
            return;
        }

        $updatedMovie = $db->findOne('movies', ['_id' => $id]);

        // Invalidate cache and trigger revalidation (best-effort, non-blocking)
        try { 
            \Utils\Cache::flush(); 
            \Utils\Cache::delete("movie_detail_" . $id);
        } catch (\Exception $e) { /* ignore cache errors */ }
        try { \Utils\Revalidate::path('/'); } catch (\Exception $e) {}
        if ($updatedMovie && !empty($updatedMovie['slug'])) {
            try { \Utils\Revalidate::media('movie', $updatedMovie['slug']); } catch (\Exception $e) {}
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Movie updated successfully', 'movie' => $updatedMovie]);
    }

    public static function deleteMovie($id) {
        $db = Database::getInstance();
        $movie = $db->findOne('movies', ['_id' => $id]);
        if (!$movie) {
            http_response_code(404);
            echo json_encode(['message' => 'Movie not found']);
            return;
        }

        $deleted = $db->deleteOne('movies', ['_id' => $id]);
        if (!$deleted) {
            http_response_code(404);
            echo json_encode(['message' => 'Movie not found']);
            return;
        }

        // Invalidate cache and trigger revalidation
        \Utils\Cache::flush();
        \Utils\Cache::delete("movie_detail_" . $id);
        \Utils\Revalidate::path('/');
        if ($movie && !empty($movie['slug'])) {
            \Utils\Revalidate::media('movie', $movie['slug']);
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Movie deleted successfully']);
    }

    public static function appendMetadataToMovies(&$movies) {
        if (empty($movies)) return;
        $db = Database::getInstance();
        
        $movieIds = array_map(function($m) { return $m['_id']; }, $movies);
        $subtitles = $db->find('subtitles', [
            'mediaId' => ['$in' => $movieIds],
            'approvalStatus' => 'Approved'
        ]);
        
        $subsCountByMediaId = [];
        $latestSubtitleAtByMediaId = [];
        foreach($subtitles as $sub) {
             $mid = (string)$sub['mediaId'];
             if (!isset($subsCountByMediaId[$mid])) $subsCountByMediaId[$mid] = 0;
             $subsCountByMediaId[$mid]++;

             $subtitleCreatedAt = $sub['createdAt'] ?? null;
             if ($subtitleCreatedAt) {
                 $currentLatest = $latestSubtitleAtByMediaId[$mid] ?? null;
                 if (!$currentLatest || strtotime($subtitleCreatedAt) > strtotime($currentLatest)) {
                     $latestSubtitleAtByMediaId[$mid] = $subtitleCreatedAt;
                 }
             }
        }
        
        // Find latest 5 published movies
        $latestMovies = $db->find('movies', ['status' => 'Published'], ['sort' => ['createdAt' => -1], 'limit' => 5]);
        $latestIds = array_map(function($lm) { return (string)$lm['_id']; }, $latestMovies);
        
        foreach ($movies as &$m) {
            $mid = (string)$m['_id'];
            $mediaImportedAt = $m['contentUpdatedAt'] ?? $m['createdAt'] ?? null;
            $latestSubtitleAt = $latestSubtitleAtByMediaId[$mid] ?? null;
            if ($latestSubtitleAt && (!$mediaImportedAt || strtotime($latestSubtitleAt) > strtotime($mediaImportedAt))) {
                $mediaImportedAt = $latestSubtitleAt;
            }
            $m['contentUpdatedAt'] = $mediaImportedAt;
            $m['isNew'] = in_array($mid, $latestIds);
            $m['subtitleCount'] = $subsCountByMediaId[$mid] ?? 0;
            $m['subtitleSummary'] = [
                'totalSubtitles' => $m['subtitleCount'],
                'languages' => $m['subtitleCount'] > 0 ? ['Sinhala'] : [],
                'progressLabel' => $m['subtitleCount'] > 0 ? $m['subtitleCount'] . ' subs' : 'No subs',
                'seasonStatus' => 'Complete',
                'latestUploaderRole' => null
            ];
        }
    }

    public static function getRecommendations() {
        // Cache layer
        $cachedRecommendations = \Utils\Cache::get('detail_recommendations_v2');
        if ($cachedRecommendations !== false) {
            header('Content-Type: application/json');
            echo json_encode($cachedRecommendations);
            return;
        }

        $db = Database::getInstance();
        $statusFilter = ['status' => 'Published'];

        // 1. Recommended movies (sort by imdbRating DESC, tmdbRating DESC, limit 12)
        $recommendedMovies = $db->find('movies', $statusFilter, [
            'sort' => ['imdbRating' => -1, 'tmdbRating' => -1],
            'limit' => 12,
            'excludeFields' => MediaPayload::detailOnlyFields()
        ]);
        self::appendMetadataToMovies($recommendedMovies);

        // 2. Recommended dramas (sort by imdbRating DESC, tmdbRating DESC, limit 12)
        $recommendedDramas = $db->find('dramas', $statusFilter, [
            'sort' => ['imdbRating' => -1, 'tmdbRating' => -1],
            'limit' => 12,
            'excludeFields' => MediaPayload::detailOnlyFields()
        ]);
        \Controllers\DramaController::appendSubtitleSummariesToDramas($recommendedDramas);

        // 3. Trending movies
        $trendingMovies = $db->find('movies', $statusFilter, [
            'sort' => ['viewCount' => -1],
            'limit' => 12,
            'excludeFields' => MediaPayload::detailOnlyFields()
        ]);
        self::appendMetadataToMovies($trendingMovies);

        // 4. Trending dramas
        $trendingDramas = $db->find('dramas', $statusFilter, [
            'sort' => ['viewCount' => -1],
            'limit' => 12,
            'excludeFields' => MediaPayload::detailOnlyFields()
        ]);
        \Controllers\DramaController::appendSubtitleSummariesToDramas($trendingDramas);

        $recommendations = [
            'recommendedMovies' => MediaPayload::compactMany($recommendedMovies),
            'recommendedDramas' => MediaPayload::compactMany($recommendedDramas),
            'trendingMovies' => MediaPayload::compactMany($trendingMovies),
            'trendingDramas' => MediaPayload::compactMany($trendingDramas)
        ];

        // Cache for 2 hours (7200 seconds)
        \Utils\Cache::set('detail_recommendations_v2', $recommendations, 7200);

        header('Content-Type: application/json');
        echo json_encode($recommendations);
    }
}
