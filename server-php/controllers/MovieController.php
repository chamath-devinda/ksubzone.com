<?php
namespace Controllers;

use Config\Database;
use Utils\Slug;

class MovieController {
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

        $filter = [];
        
        if (!\Middleware\AuthMiddleware::isAdmin()) {
            $filter['status'] = ['$in' => ['Published', 'Upcoming']];
        } else {
            if ($status && $status !== 'All') {
                $filter['status'] = $status;
            } elseif (!$status) {
                $filter['status'] = ['$in' => ['Published', 'Upcoming']];
            }
        }

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

        $sortOptions = ['createdAt' => -1];
        if ($sort === 'oldest') {
            $sortOptions = ['releaseDate' => 1];
        } elseif ($sort === 'newest') {
            $sortOptions = ['createdAt' => -1];
        } elseif ($sort === 'rating') {
            $sortOptions = ['imdbRating' => -1, 'tmdbRating' => -1];
        } elseif ($sort === 'popular' || $sort === 'views') {
            $sortOptions = ['viewCount' => -1];
        } elseif ($sort === 'az') {
            $sortOptions = ['title' => 1];
        }

        $skip = ($page - 1) * $limit;

        // Caching layer for search queries
        $cacheKey = "search_movies_" . md5(json_encode($_GET));
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
            'skip' => $skip
        ]);

        self::appendMetadataToMovies($movies);

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
        $cachedCatalog = \Utils\Cache::get('home_catalog_v3');
        if ($cachedCatalog !== false) {
            header('Content-Type: application/json');
            echo json_encode($cachedCatalog);
            return;
        }

        $db = Database::getInstance();
        $statusFilter = ['status' => 'Published'];

        // 1. Latest movies (status: Published, sort: createdAt DESC, limit 12)
        $latestMovies = $db->find('movies', $statusFilter, ['sort' => ['createdAt' => -1], 'limit' => 12]);
        
        // 2. Latest dramas (status: Published, sort: updatedAt DESC, limit 40 to prioritize ongoing and new ones)
        $latestDramas = $db->find('dramas', $statusFilter, ['sort' => ['updatedAt' => -1], 'limit' => 40]);
        
        // 3. Historical movies (status: Published, isHistorical: true, sort: imdbRating DESC, limit 12)
        $historicalMovies = $db->find('movies', array_merge($statusFilter, ['isHistorical' => true]), ['sort' => ['imdbRating' => -1], 'limit' => 12]);
        
        // 4. Historical dramas (status: Published, isHistorical: true, sort: imdbRating DESC, limit 12)
        $historicalDramas = $db->find('dramas', array_merge($statusFilter, ['isHistorical' => true]), ['sort' => ['imdbRating' => -1], 'limit' => 12]);
        
        // 5. Trending movies (status: Published, sort: viewCount DESC, limit 12)
        $trendingMovies = $db->find('movies', $statusFilter, ['sort' => ['viewCount' => -1], 'limit' => 12]);
        
        // 6. Trending dramas (status: Published, sort: viewCount DESC, limit 12)
        $trendingDramas = $db->find('dramas', $statusFilter, ['sort' => ['viewCount' => -1], 'limit' => 12]);
        
        // 7. Popular movies (status: Published, sort: viewCount DESC, limit 12)
        $popularMovies = $db->find('movies', $statusFilter, ['sort' => ['viewCount' => -1], 'limit' => 12]);
        
        // 8. Popular dramas (status: Published, sort: viewCount DESC, limit 12)
        $popularDramas = $db->find('dramas', $statusFilter, ['sort' => ['viewCount' => -1], 'limit' => 12]);

        // 9. Upcoming movies (status: Upcoming, sort: releaseDate ASC, limit 12)
        $upcomingMovies = $db->find('movies', ['status' => 'Upcoming'], ['sort' => ['releaseDate' => 1], 'limit' => 12]);

        // 10. Upcoming dramas (status: Upcoming, sort: releaseDate ASC, limit 12)
        $upcomingDramas = $db->find('dramas', ['status' => 'Upcoming'], ['sort' => ['releaseDate' => 1], 'limit' => 12]);

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
                'subtitleSummary' => $d['subtitleSummary']
            ];
        }
        
        foreach ($latestDramas as &$d) {
            $d['isNew'] = $dramaMetadata[$d['_id']]['isNew'];
            $d['subtitleSummary'] = $dramaMetadata[$d['_id']]['subtitleSummary'];
        }
        unset($d);

        // Sort $latestDramas by prioritizing Ongoing and New releases, then by updatedAt DESC
        usort($latestDramas, function($a, $b) {
            $aOngoing = ($a['subtitleSummary']['seasonStatus'] ?? '') === 'Ongoing';
            $bOngoing = ($b['subtitleSummary']['seasonStatus'] ?? '') === 'Ongoing';
            
            $aNew = !empty($a['isNew']);
            $bNew = !empty($b['isNew']);
            
            $aScore = ($aOngoing ? 2 : 0) + ($aNew ? 1 : 0);
            $bScore = ($bOngoing ? 2 : 0) + ($bNew ? 1 : 0);
            
            if ($aScore !== $bScore) {
                return $bScore <=> $aScore;
            }
            
            $aTime = isset($a['updatedAt']) ? strtotime($a['updatedAt']) : 0;
            $bTime = isset($b['updatedAt']) ? strtotime($b['updatedAt']) : 0;
            return $bTime <=> $aTime;
        });

        // Slice to the requested limit of 12 for the homepage updates
        $latestDramas = array_slice($latestDramas, 0, 12);
        foreach ($historicalDramas as &$d) {
            $d['isNew'] = $dramaMetadata[$d['_id']]['isNew'];
            $d['subtitleSummary'] = $dramaMetadata[$d['_id']]['subtitleSummary'];
        }
        unset($d);
        foreach ($trendingDramas as &$d) {
            $d['isNew'] = $dramaMetadata[$d['_id']]['isNew'];
            $d['subtitleSummary'] = $dramaMetadata[$d['_id']]['subtitleSummary'];
        }
        unset($d);
        foreach ($popularDramas as &$d) {
            $d['isNew'] = $dramaMetadata[$d['_id']]['isNew'];
            $d['subtitleSummary'] = $dramaMetadata[$d['_id']]['subtitleSummary'];
        }
        unset($d);
        foreach ($upcomingDramas as &$d) {
            $d['isNew'] = $dramaMetadata[$d['_id']]['isNew'];
            $d['subtitleSummary'] = $dramaMetadata[$d['_id']]['subtitleSummary'];
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
                'subtitleSummary' => $m['subtitleSummary']
            ];
        }
        
        foreach ($latestMovies as &$m) {
            $m['isNew'] = $movieMetadata[$m['_id']]['isNew'];
            $m['subtitleCount'] = $movieMetadata[$m['_id']]['subtitleCount'];
            $m['subtitleSummary'] = $movieMetadata[$m['_id']]['subtitleSummary'];
        }
        unset($m);
        foreach ($historicalMovies as &$m) {
            $m['isNew'] = $movieMetadata[$m['_id']]['isNew'];
            $m['subtitleCount'] = $movieMetadata[$m['_id']]['subtitleCount'];
            $m['subtitleSummary'] = $movieMetadata[$m['_id']]['subtitleSummary'];
        }
        unset($m);
        foreach ($trendingMovies as &$m) {
            $m['isNew'] = $movieMetadata[$m['_id']]['isNew'];
            $m['subtitleCount'] = $movieMetadata[$m['_id']]['subtitleCount'];
            $m['subtitleSummary'] = $movieMetadata[$m['_id']]['subtitleSummary'];
        }
        unset($m);
        foreach ($popularMovies as &$m) {
            $m['isNew'] = $movieMetadata[$m['_id']]['isNew'];
            $m['subtitleCount'] = $movieMetadata[$m['_id']]['subtitleCount'];
            $m['subtitleSummary'] = $movieMetadata[$m['_id']]['subtitleSummary'];
        }
        unset($m);
        foreach ($upcomingMovies as &$m) {
            $m['isNew'] = $movieMetadata[$m['_id']]['isNew'];
            $m['subtitleCount'] = $movieMetadata[$m['_id']]['subtitleCount'];
            $m['subtitleSummary'] = $movieMetadata[$m['_id']]['subtitleSummary'];
        }
        unset($m);

        $catalogData = [
            'latestMovies' => $latestMovies,
            'latestDramas' => $latestDramas,
            'historicalMovies' => $historicalMovies,
            'historicalDramas' => $historicalDramas,
            'trendingMovies' => $trendingMovies,
            'trendingDramas' => $trendingDramas,
            'popularMovies' => $popularMovies,
            'popularDramas' => $popularDramas,
            'upcomingMovies' => $upcomingMovies,
            'upcomingDramas' => $upcomingDramas
        ];

        // Cache for 2 hours (7200 seconds)
        \Utils\Cache::set('home_catalog_v3', $catalogData, 7200);

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
            ], ['limit' => 4]);
        }

        // Append metadata (isNew & subtitleCount) to main movie and related movies
        $moviesArr = [&$movie];
        self::appendMetadataToMovies($moviesArr);
        if (!empty($related)) {
            self::appendMetadataToMovies($related);
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
        foreach($subtitles as $sub) {
             $mid = (string)$sub['mediaId'];
             if (!isset($subsCountByMediaId[$mid])) $subsCountByMediaId[$mid] = 0;
             $subsCountByMediaId[$mid]++;
        }
        
        // Find latest 5 published movies
        $latestMovies = $db->find('movies', ['status' => 'Published'], ['sort' => ['createdAt' => -1], 'limit' => 5]);
        $latestIds = array_map(function($lm) { return (string)$lm['_id']; }, $latestMovies);
        
        foreach ($movies as &$m) {
            $mid = (string)$m['_id'];
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
        $cachedRecommendations = \Utils\Cache::get('detail_recommendations');
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
            'limit' => 12
        ]);
        self::appendMetadataToMovies($recommendedMovies);

        // 2. Recommended dramas (sort by imdbRating DESC, tmdbRating DESC, limit 12)
        $recommendedDramas = $db->find('dramas', $statusFilter, [
            'sort' => ['imdbRating' => -1, 'tmdbRating' => -1],
            'limit' => 12
        ]);
        \Controllers\DramaController::appendSubtitleSummariesToDramas($recommendedDramas);

        // 3. Trending movies
        $trendingMovies = $db->find('movies', $statusFilter, [
            'sort' => ['viewCount' => -1],
            'limit' => 12
        ]);
        self::appendMetadataToMovies($trendingMovies);

        // 4. Trending dramas
        $trendingDramas = $db->find('dramas', $statusFilter, [
            'sort' => ['viewCount' => -1],
            'limit' => 12
        ]);
        \Controllers\DramaController::appendSubtitleSummariesToDramas($trendingDramas);

        $recommendations = [
            'recommendedMovies' => $recommendedMovies,
            'recommendedDramas' => $recommendedDramas,
            'trendingMovies' => $trendingMovies,
            'trendingDramas' => $trendingDramas
        ];

        // Cache for 2 hours (7200 seconds)
        \Utils\Cache::set('detail_recommendations', $recommendations, 7200);

        header('Content-Type: application/json');
        echo json_encode($recommendations);
    }
}










