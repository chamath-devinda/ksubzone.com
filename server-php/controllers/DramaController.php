<?php
namespace Controllers;

use Config\Database;
use Utils\Slug;
use Utils\MediaPayload;

class DramaController {

    /**
     * Return aired episodes that still have no approved subtitle. This keeps
     * the admin notification bell to one request instead of a burst of detail
     * requests for every drama.
     */
    public static function getMissingSubtitleAlerts() {
        $limit = max(1, min((int)($_GET['limit'] ?? 50), 100));
        $cacheKey = 'admin_missing_subtitle_alerts_v1_' . $limit;
        $cached = \Utils\Cache::get($cacheKey);
        if ($cached !== false) {
            header('Content-Type: application/json');
            echo json_encode($cached);
            return;
        }

        $db = Database::getInstance();
        $dramas = $db->find('dramas', ['status' => 'Published'], [
            'sort' => ['contentUpdatedAt' => -1, 'createdAt' => -1],
            'limit' => $limit
        ]);

        if (empty($dramas)) {
            header('Content-Type: application/json');
            echo json_encode(['alerts' => []]);
            return;
        }

        $dramaIds = array_map(function($drama) { return $drama['_id']; }, $dramas);
        $dramaMap = [];
        foreach ($dramas as $drama) {
            $dramaMap[(string)$drama['_id']] = $drama;
        }

        $seasons = $db->find('seasons', ['dramaId' => ['$in' => $dramaIds]]);
        $seasonNumberById = [];
        foreach ($seasons as $season) {
            $seasonNumberById[(string)$season['_id']] = (int)($season['seasonNumber'] ?? 1);
        }

        $episodes = $db->find('episodes', ['dramaId' => ['$in' => $dramaIds]]);
        $airedEpisodes = [];
        $airedEpisodeIds = [];
        $now = time();
        foreach ($episodes as $episode) {
            $airDate = $episode['airDate'] ?? null;
            $airTimestamp = $airDate ? strtotime($airDate) : false;
            if ($airTimestamp === false || $airTimestamp > $now) continue;

            $airedEpisodes[] = $episode;
            $airedEpisodeIds[] = $episode['_id'];
        }

        $subtitledEpisodeIds = [];
        if (!empty($airedEpisodeIds)) {
            $subtitles = $db->find('subtitles', [
                'mediaId' => ['$in' => $airedEpisodeIds],
                'approvalStatus' => 'Approved'
            ]);
            foreach ($subtitles as $subtitle) {
                $subtitledEpisodeIds[(string)$subtitle['mediaId']] = true;
            }
        }

        $alerts = [];
        foreach ($airedEpisodes as $episode) {
            if (isset($subtitledEpisodeIds[(string)$episode['_id']])) continue;

            $drama = $dramaMap[(string)($episode['dramaId'] ?? '')] ?? null;
            if (!$drama) continue;

            $alerts[] = [
                'id' => $episode['_id'],
                'dramaTitle' => $drama['title'] ?? 'Untitled Drama',
                'dramaSlug' => $drama['slug'] ?? '',
                'season' => $seasonNumberById[(string)($episode['seasonId'] ?? '')] ?? (int)($episode['seasonNumber'] ?? 1),
                'episode' => (int)($episode['episodeNumber'] ?? 0),
                'episodeTitle' => $episode['episodeTitle'] ?? '',
                'poster' => $drama['poster'] ?? null,
                'airDate' => $episode['airDate'] ?? null
            ];
        }

        usort($alerts, function($a, $b) {
            $airDateDiff = (strtotime($b['airDate'] ?? '') ?: 0) <=> (strtotime($a['airDate'] ?? '') ?: 0);
            if ($airDateDiff !== 0) return $airDateDiff;
            return ($b['episode'] ?? 0) <=> ($a['episode'] ?? 0);
        });

        $payload = ['alerts' => array_slice($alerts, 0, 100)];
        \Utils\Cache::set($cacheKey, $payload, 120);

        header('Content-Type: application/json');
        echo json_encode($payload);
    }

    /**
     * Admin-only: fetch all dramas (all statuses) without caching.
     * Used by the admin DramaManager panel.
     */
    public static function getAdminDramas() {
        $db = Database::getInstance();
        $status = $_GET['status'] ?? 'All';
        $search = $_GET['search'] ?? null;
        $limit = max(1, min((int)($_GET['limit'] ?? 200), 500));

        $filter = [];
        if ($status && $status !== 'All') {
            $filter['status'] = $status;
        }
        // No status filter when 'All' — returns published + draft

        if (!empty($search)) {
            $filter['title'] = ['$regex' => $search, '$options' => 'i'];
        }

        $dramas = $db->find('dramas', $filter, [
            'sort' => ['createdAt' => -1],
            'limit' => $limit
        ]);

        self::appendSubtitleSummariesToDramas($dramas);
        $dramasArray = array_values($dramas);

        header('Content-Type: application/json');
        echo json_encode([
            'total' => count($dramasArray),
            'dramas' => $dramasArray
        ]);
    }

    public static function getDramaStructure($id) {
        $db = Database::getInstance();
        $drama = $db->findOne('dramas', ['_id' => $id]);
        if (!$drama) {
            http_response_code(404);
            echo json_encode(['message' => 'Drama not found']);
            return;
        }

        $seasons = $db->find('seasons', ['dramaId' => $id], ['sort' => ['seasonNumber' => 1]]);
        $seasonIds = array_map(function($s) { return $s['_id']; }, $seasons);

        $episodes = [];
        if (!empty($seasonIds)) {
            $episodes = $db->find('episodes', [
                '$or' => [
                    ['dramaId' => $id],
                    ['seasonId' => ['$in' => $seasonIds]]
                ]
            ], ['sort' => ['seasonNumber' => 1, 'episodeNumber' => 1]]);
        } else {
            $episodes = $db->find('episodes', ['dramaId' => $id], ['sort' => ['episodeNumber' => 1]]);
        }

        // Fetch subtitles attached to drama and these episodes
        $episodeIds = array_map(function($e) { return $e['_id']; }, $episodes);
        $allIds = array_merge([$id], $episodeIds);
        $subtitles = !empty($allIds) ? $db->find('subtitles', ['mediaId' => ['$in' => $allIds]]) : [];
        
        $subsByMediaId = [];
        $subsByEpNum = [];
        foreach ($subtitles as $sub) {
            $mId = (string)($sub['mediaId'] ?? '');
            $subsByMediaId[$mId][] = $sub;
            if (isset($sub['episodeNumber']) && $sub['episodeNumber'] !== null) {
                $sNum = (int)($sub['seasonNumber'] ?? 1);
                $eNum = (int)$sub['episodeNumber'];
                $subsByEpNum["{$sNum}_{$eNum}"][] = $sub;
            }
        }

        foreach ($episodes as &$ep) {
            $epId = (string)$ep['_id'];
            $epNum = (int)($ep['episodeNumber'] ?? 1);
            $sNum = (int)($ep['seasonNumber'] ?? 1);

            $epSubs = $subsByMediaId[$epId] ?? [];
            if (empty($epSubs) && isset($subsByEpNum["{$sNum}_{$epNum}"])) {
                $epSubs = $subsByEpNum["{$sNum}_{$epNum}"];
            }

            $ep['subtitles'] = $epSubs;
            $ep['subtitleCount'] = count($epSubs);
        }
        unset($ep);

        header('Content-Type: application/json');
        echo json_encode([
            'drama' => $drama,
            'seasons' => array_values($seasons),
            'episodes' => array_values($episodes)
        ]);
    }

    public static function getAllDramas() {
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

        // Public catalog data is session-independent. Admin management uses a
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
        $cacheKey = "search_dramas_v2_" . md5(json_encode($_GET));
        $cached = \Utils\Cache::get($cacheKey);
        if ($cached !== false) {
            header('Content-Type: application/json');
            echo json_encode($cached);
            return;
        }

        $db = Database::getInstance();
        $total = $db->count('dramas', $filter);
        $dramas = $db->find('dramas', $filter, [
            'sort' => $sortOptions,
            'limit' => $limit,
            'skip' => $skip,
            'excludeFields' => MediaPayload::detailOnlyFields()
        ]);

        self::appendSubtitleSummariesToDramas($dramas);
        $dramas = MediaPayload::compactMany($dramas);

        $payload = [
            'total' => $total,
            'page' => $page,
            'totalPages' => ceil($total / $limit),
            'dramas' => $dramas
        ];

        // Cache search results for 10 minutes (600 seconds)
        \Utils\Cache::set($cacheKey, $payload, 600);

        header('Content-Type: application/json');
        echo json_encode($payload);
    }

    public static function getDramaBySlug($slug) {
        $db = Database::getInstance();

        $drama = Slug::findByPermalinkSlug($db, 'dramas', $slug);
        if (!$drama) {
            http_response_code(404);
            echo json_encode(['message' => 'Drama not found']);
            return;
        }

        $dStatus = $drama['status'] ?? 'Published';
        if ($dStatus !== 'Published' && $dStatus !== 'Upcoming' && !\Middleware\AuthMiddleware::isAdmin()) {
            http_response_code(404);
            echo json_encode(['message' => 'Drama not found']);
            return;
        }

        // Caching layer
        $cacheKey = "drama_detail_" . $drama['_id'];
        $cached = \Utils\Cache::get($cacheKey);
        if ($cached !== false) {
            // Background view increment — only count unique visitors once per day
            try {
                if (\Utils\VisitorGuard::shouldCount((string)$drama['_id'])) {
                    $views = ($drama['viewCount'] ?? 0) + 1;
                    $db->updateOne('dramas', ['_id' => $drama['_id']], ['viewCount' => $views]);
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
            if (\Utils\VisitorGuard::shouldCount((string)$drama['_id'])) {
                $views = ($drama['viewCount'] ?? 0) + 1;
                $db->updateOne('dramas', ['_id' => $drama['_id']], ['viewCount' => $views]);
                $drama['viewCount'] = $views;
            }
        } catch (\Exception $e) {
            // Ignore view count write-lock errors to keep page load stable
        }

        // Calculate "New" tag based on whether it is in the latest 5 dramas globally
        $latestDramas = $db->find('dramas', ['status' => 'Published'], ['sort' => ['createdAt' => -1], 'limit' => 5]);
        $latestIds = array_map(function($ld) { return (string)$ld['_id']; }, $latestDramas);
        $drama['isNew'] = in_array((string)$drama['_id'], $latestIds);

        // Fetch seasons & episodes first so they can be reused for the subtitle summary
        $seasons = $db->find('seasons', ['dramaId' => $drama['_id']], ['sort' => ['seasonNumber' => 1]]);
        $episodes = $db->find('episodes', ['dramaId' => $drama['_id']], ['sort' => ['seasonId' => 1, 'episodeNumber' => 1]]);

        // Fetch all approved subtitles for both the drama and its episodes in a single query
        $episodeIds = array_map(function($ep) { return $ep['_id']; }, $episodes);
        $allIds = array_merge([$drama['_id']], $episodeIds);
        
        $allSubtitles = $db->find('subtitles', [
            'mediaId' => ['$in' => $allIds],
            'approvalStatus' => 'Approved'
        ]);

        // updatedAt can be changed by visitor view tracking. It is not a
        // public content update, so legacy records fall back to creation time.
        $drama['contentUpdatedAt'] = $drama['contentUpdatedAt'] ?? $drama['createdAt'] ?? null;
        foreach ($allSubtitles as $sub) {
            $subtitleCreatedAt = $sub['createdAt'] ?? null;
            if ($subtitleCreatedAt && (!$drama['contentUpdatedAt'] || strtotime($subtitleCreatedAt) > strtotime($drama['contentUpdatedAt']))) {
                $drama['contentUpdatedAt'] = $subtitleCreatedAt;
            }
        }

        // Batch populate uploader for all subtitles
        $uploaderIds = [];
        foreach ($allSubtitles as $sub) {
            $uId = $sub['uploader'] ?? null;
            if ($uId) {
                $uploaderIds[] = $uId;
            }
        }
        $uploaderIds = array_values(array_unique($uploaderIds));
        
        $userMap = [];
        if (!empty($uploaderIds)) {
            $usersList = $db->find('users', ['_id' => ['$in' => $uploaderIds]]);
            foreach ($usersList as $u) {
                $userMap[$u['_id']] = [
                    '_id' => $u['_id'],
                    'username' => $u['username'],
                    'avatar' => $u['avatar'] ?? ''
                ];
            }
        }
        foreach ($allSubtitles as &$sub) {
            $uId = $sub['uploader'] ?? null;
            $sub['uploader'] = $uId ? ($userMap[$uId] ?? null) : null;
        }
        unset($sub);

        // Dynamic subtitle summary (passing pre-fetched seasons, episodes, and subtitles to save database queries)
        $drama['subtitleSummary'] = self::getSubtitleSummaryForDrama($drama['_id'], $seasons, $episodes, $allSubtitles, $drama['status'] ?? null);

        // Map seasonId to seasonNumber for proper ordering across seasons
        $seasonNumberMap = [];
        foreach ($seasons as $s) {
            $seasonNumberMap[(string)$s['_id']] = (int)($s['seasonNumber'] ?? 1);
        }

        // Sort episodes numerically by seasonNumber, then by episodeNumber
        usort($episodes, function($a, $b) use ($seasonNumberMap) {
            $aSeasonId = (string)($a['seasonId'] ?? '');
            $bSeasonId = (string)($b['seasonId'] ?? '');
            
            $aSeasonNum = $seasonNumberMap[$aSeasonId] ?? 0;
            $bSeasonNum = $seasonNumberMap[$bSeasonId] ?? 0;
            
            if ($aSeasonNum !== $bSeasonNum) {
                return $aSeasonNum <=> $bSeasonNum;
            }
            
            $aEpNum = (int)($a['episodeNumber'] ?? 0);
            $bEpNum = (int)($b['episodeNumber'] ?? 0);
            
            return $aEpNum <=> $bEpNum;
        });

        // Separate standalone subtitles from episode subtitles, and set episode subtitle counts
        $standaloneSubtitles = [];
        $episodeSubtitles = [];
        $subsCountByMediaId = [];
        foreach ($allSubtitles as $sub) {
            $mId = (string)$sub['mediaId'];
            if ($mId === (string)$drama['_id']) {
                $standaloneSubtitles[] = $sub;
            } else {
                $episodeSubtitles[] = $sub;
                if (!isset($subsCountByMediaId[$mId])) {
                    $subsCountByMediaId[$mId] = 0;
                }
                $subsCountByMediaId[$mId]++;
            }
        }

        foreach ($episodes as &$ep) {
            $mid = (string)$ep['_id'];
            $ep['subtitleCount'] = $subsCountByMediaId[$mid] ?? 0;
        }
        unset($ep);

        // Fetch related dramas (excluding current, sharing keywords)
        $related = [];
        if (!empty($drama['keywords'])) {
            $related = $db->find('dramas', [
                '_id' => ['$ne' => $drama['_id']],
                'keywords' => ['$in' => $drama['keywords']]
            ], ['limit' => 4, 'excludeFields' => MediaPayload::detailOnlyFields()]);

            self::appendSubtitleSummariesToDramas($related);
            $related = MediaPayload::compactMany($related);
        }

        // Fetch comments using batch user populating
        $comments = \Controllers\CommentController::fetchCommentsForTargetWithBatchPopulate($drama['_id']);

        $payload = [
            'drama' => $drama,
            'seasons' => $seasons,
            'episodes' => $episodes,
            'related' => $related,
            'subtitles' => $standaloneSubtitles,
            'episodeSubtitles' => $episodeSubtitles,
            'comments' => $comments
        ];

        // Cache details payload for 1 hour (3600 seconds)
        \Utils\Cache::set($cacheKey, $payload, 3600);

        header('Content-Type: application/json');
        echo json_encode($payload);
    }

    public static function createDrama() {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        if (empty($data['title'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Drama Title is required']);
            return;
        }

        $db = Database::getInstance();

        // Unique slug
        $data['slug'] = Slug::createUniqueSlug(function($candidate) use ($db) {
            return $db->findOne('dramas', ['slug' => $candidate]);
        }, $data['title']);
        $data['contentUpdatedAt'] = gmdate(DATE_ATOM);

        // Generate AI SEO package
        $seoContent = AiSeoController::generateSeoForTitle($data['title'], $data['description'] ?? '', 'Drama', [
            'genres' => $data['keywords'] ?? [],
            'releaseDate' => $data['releaseDate'] ?? null,
            'director' => $data['director'] ?? '',
            'cast' => array_map(function($c) { return is_array($c) ? ($c['name'] ?? '') : (is_string($c) ? $c : ''); }, $data['cast'] ?? [])
        ]);

        $finalDramaData = array_merge($data, $seoContent);
        $inserted = $db->insertOne('dramas', $finalDramaData);

        // Invalidate cache and trigger revalidation
        \Utils\Cache::flush();
        if ($inserted && !empty($inserted['_id'])) {
            \Utils\Cache::delete("drama_detail_" . $inserted['_id']);
        }
        \Utils\Revalidate::path('/');
        if ($inserted && !empty($inserted['slug'])) {
            \Utils\Revalidate::media('drama', $inserted['slug']);
        }

        http_response_code(201);
        echo json_encode(['message' => 'Drama created successfully', 'drama' => $inserted]);
    }

    public static function updateDrama($id) {
        $updates = json_decode(file_get_contents('php://input'), true) ?: [];
        $db = Database::getInstance();

        $drama = $db->findOne('dramas', ['_id' => $id]);
        if (!$drama) {
            http_response_code(404);
            echo json_encode(['message' => 'Drama not found']);
            return;
        }

        // Handle manual slug update - sanitize and ensure uniqueness
        if (!empty($updates['slug'])) {
            $newSlug = Slug::slugify($updates['slug']);
            $conflict = $db->findOne('dramas', ['slug' => $newSlug]);
            if ($conflict && (string)$conflict['_id'] !== (string)$id) {
                http_response_code(409);
                echo json_encode(['message' => "Slug '{$newSlug}' is already used by another drama."]);
                return;
            }
            $updates['slug'] = $newSlug;
        }

        // Re-generate SEO package if title or description changes
        if (!empty($updates['title']) || !empty($updates['description'])) {
            $title = $updates['title'] ?? $drama['title'];
            $desc = $updates['description'] ?? $drama['description'] ?? '';
            $seoContent = AiSeoController::generateSeoForTitle($title, $desc, 'Drama', [
                'genres' => $updates['keywords'] ?? $drama['keywords'] ?? [],
                'releaseDate' => $updates['releaseDate'] ?? $drama['releaseDate'] ?? null,
                'director' => $updates['director'] ?? $drama['director'] ?? '',
                'cast' => array_map(function($c) { return is_array($c) ? ($c['name'] ?? '') : (is_string($c) ? $c : ''); }, $updates['cast'] ?? $drama['cast'] ?? [])
            ]);
            $updates = array_merge($updates, $seoContent);
        }



        // Persist the edit time in the document as well as the database row.
        // This keeps MongoDB and SQL drivers consistent and lets the frontend
        // show the current "updated ago" value immediately.
        $contentUpdatedAt = gmdate(DATE_ATOM);
        $updates['updatedAt'] = date('Y-m-d H:i:s');
        $updates['contentUpdatedAt'] = $contentUpdatedAt;
        $db->updateOne('dramas', ['_id' => $id], $updates);
        $updatedDrama = $db->findOne('dramas', ['_id' => $id]);

        // Invalidate cache and trigger revalidation
        \Utils\Cache::flush();
        \Utils\Cache::delete("drama_detail_" . $id);
        \Utils\Revalidate::path('/');
        if ($updatedDrama && !empty($updatedDrama['slug'])) {
            \Utils\Revalidate::media('drama', $updatedDrama['slug']);
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Drama updated successfully', 'drama' => $updatedDrama]);
    }

    public static function deleteDrama($id) {
        $db = Database::getInstance();
        $drama = $db->findOne('dramas', ['_id' => $id]);
        if (!$drama) {
            http_response_code(404);
            echo json_encode(['message' => 'Drama not found']);
            return;
        }

        $deleted = $db->deleteOne('dramas', ['_id' => $id]);
        if (!$deleted) {
            http_response_code(404);
            echo json_encode(['message' => 'Drama not found']);
            return;
        }

        // Delete cascading seasons and episodes
        $db->deleteMany('seasons', ['dramaId' => $id]);
        $db->deleteMany('episodes', ['dramaId' => $id]);

        // Invalidate cache and trigger revalidation
        \Utils\Cache::flush();
        \Utils\Cache::delete("drama_detail_" . $id);
        \Utils\Revalidate::path('/');
        if ($drama && !empty($drama['slug'])) {
            \Utils\Revalidate::media('drama', $drama['slug']);
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Drama and cascading seasons/episodes deleted']);
    }

    /* --- SEASON MANAGEMENT --- */

    public static function addSeason() {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $dramaId = $data['dramaId'] ?? null;
        $seasonNumber = $data['seasonNumber'] ?? null;

        if (!$dramaId || !$seasonNumber) {
            http_response_code(400);
            echo json_encode(['message' => 'Drama ID and Season Number are required']);
            return;
        }

        $db = Database::getInstance();
        $inserted = $db->insertOne('seasons', [
            'dramaId' => $dramaId,
            'seasonNumber' => (int)$seasonNumber,
            'seasonDescription' => $data['seasonDescription'] ?? '',
            'seasonPoster' => $data['seasonPoster'] ?? '',
            'airDate' => $data['airDate'] ?? null
        ]);

        // Invalidate cache and trigger revalidation
        \Utils\Cache::flush();
        \Utils\Cache::delete("drama_detail_" . $dramaId);
        \Utils\Revalidate::path('/');
        self::bumpDramaUpdatedAt($dramaId);
        $drama = $db->findOne('dramas', ['_id' => $dramaId]);
        if ($drama && !empty($drama['slug'])) {
            \Utils\Revalidate::media('drama', $drama['slug']);
        }

        http_response_code(201);
        echo json_encode(['message' => 'Season added successfully', 'season' => $inserted]);
    }

    public static function editSeason($id) {
        $updates = json_decode(file_get_contents('php://input'), true) ?: [];
        $db = Database::getInstance();

        $season = $db->findOne('seasons', ['_id' => $id]);
        if (!$season) {
            http_response_code(404);
            echo json_encode(['message' => 'Season not found']);
            return;
        }

        $db->updateOne('seasons', ['_id' => $id], $updates);
        $updated = $db->findOne('seasons', ['_id' => $id]);

        // Invalidate cache and trigger revalidation
        \Utils\Cache::flush();
        if ($season && !empty($season['dramaId'])) {
            \Utils\Cache::delete("drama_detail_" . $season['dramaId']);
        }
        \Utils\Revalidate::path('/');
        if ($season && !empty($season['dramaId'])) {
            self::bumpDramaUpdatedAt($season['dramaId']);
            $drama = $db->findOne('dramas', ['_id' => $season['dramaId']]);
            if ($drama && !empty($drama['slug'])) {
                \Utils\Revalidate::media('drama', $drama['slug']);
            }
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Season updated successfully', 'season' => $updated]);
    }

    public static function deleteSeason($id) {
        $db = Database::getInstance();
        $season = $db->findOne('seasons', ['_id' => $id]);
        if (!$season) {
            http_response_code(404);
            echo json_encode(['message' => 'Season not found']);
            return;
        }

        $deleted = $db->deleteOne('seasons', ['_id' => $id]);
        if (!$deleted) {
            http_response_code(404);
            echo json_encode(['message' => 'Season not found']);
            return;
        }

        // Cascade delete episodes
        $db->deleteMany('episodes', ['seasonId' => $id]);

        // Invalidate cache and trigger revalidation
        \Utils\Cache::flush();
        if ($season && !empty($season['dramaId'])) {
            \Utils\Cache::delete("drama_detail_" . $season['dramaId']);
        }
        \Utils\Revalidate::path('/');
        if ($season && !empty($season['dramaId'])) {
            self::bumpDramaUpdatedAt($season['dramaId']);
            $drama = $db->findOne('dramas', ['_id' => $season['dramaId']]);
            if ($drama && !empty($drama['slug'])) {
                \Utils\Revalidate::media('drama', $drama['slug']);
            }
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Season and episodes deleted successfully']);
    }

    /* --- EPISODE MANAGEMENT --- */

    public static function addEpisode() {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $dramaId = $data['dramaId'] ?? null;
        $seasonId = $data['seasonId'] ?? null;
        $episodeNumber = $data['episodeNumber'] ?? null;
        $episodeTitle = $data['episodeTitle'] ?? null;

        if (!$dramaId || !$seasonId || !$episodeNumber || !$episodeTitle) {
            http_response_code(400);
            echo json_encode(['message' => 'Drama ID, Season ID, Episode Number, and Title are required']);
            return;
        }

        $db = Database::getInstance();
        $season = $db->findOne('seasons', ['_id' => $seasonId]);
        $drama = $db->findOne('dramas', ['_id' => $dramaId]);

        if (!$season || !$drama) {
            http_response_code(404);
            echo json_encode(['message' => 'Drama or Season parent reference not found']);
            return;
        }

        $epSchema = [
            "@context" => "https://schema.org",
            "@type" => "TVEpisode",
            "name" => $episodeTitle,
            "episodeNumber" => (int)$episodeNumber,
            "description" => $data['episodeDescription'] ?? '',
            "datePublished" => $data['airDate'] ?? null,
            "partOfSeason" => [
                "@type" => "TVSeason",
                "seasonNumber" => $season['seasonNumber'] ?? 1
            ],
            "partOfSeries" => [
                "@type" => "TVSeries",
                "name" => $drama['title'] ?? ''
            ]
        ];

        $episode = [
            'dramaId' => $dramaId,
            'seasonId' => $seasonId,
            'episodeNumber' => (int)$episodeNumber,
            'episodeTitle' => $episodeTitle,
            'episodeDescription' => $data['episodeDescription'] ?? '',
            'episodeThumbnail' => $data['episodeThumbnail'] ?? ($drama['banner'] ?? ''),
            'airDate' => $data['airDate'] ?? null,
            'runtime' => (int)($data['runtime'] ?? ($drama['runtime'] ?? 60)),
            'trailer' => $data['trailer'] ?? '',
            'videoUrl' => $data['videoUrl'] ?? 'https://www.w3schools.com/html/mov_bbb.mp4',
            'aiEpisodeSummary' => "AI generated recap for " . ($drama['title'] ?? '') . " S" . ($season['seasonNumber'] ?? 1) . "E" . $episodeNumber . ": " . ($data['episodeDescription'] ?? ''),
            'episodeSchemaMarkup' => $epSchema
        ];

        $inserted = $db->insertOne('episodes', $episode);

        // Invalidate cache and trigger revalidation
        \Utils\Cache::flush();
        \Utils\Cache::delete("drama_detail_" . $dramaId);
        \Utils\Revalidate::path('/');
        self::bumpDramaUpdatedAt($dramaId);
        if ($drama && !empty($drama['slug'])) {
            \Utils\Revalidate::media('drama', $drama['slug']);
        }

        http_response_code(201);
        echo json_encode(['message' => 'Episode created successfully', 'episode' => $inserted]);
    }

    public static function editEpisode($id) {
        $updates = json_decode(file_get_contents('php://input'), true) ?: [];
        $db = Database::getInstance();

        $episode = $db->findOne('episodes', ['_id' => $id]);
        if (!$episode) {
            http_response_code(404);
            echo json_encode(['message' => 'Episode not found']);
            return;
        }

        $db->updateOne('episodes', ['_id' => $id], $updates);
        $updated = $db->findOne('episodes', ['_id' => $id]);

        // Invalidate cache and trigger revalidation
        \Utils\Cache::flush();
        if ($episode && !empty($episode['dramaId'])) {
            \Utils\Cache::delete("drama_detail_" . $episode['dramaId']);
        }
        \Utils\Revalidate::path('/');
        if ($episode && !empty($episode['dramaId'])) {
            self::bumpDramaUpdatedAt($episode['dramaId']);
            $drama = $db->findOne('dramas', ['_id' => $episode['dramaId']]);
            if ($drama && !empty($drama['slug'])) {
                \Utils\Revalidate::media('drama', $drama['slug']);
            }
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Episode updated successfully', 'episode' => $updated]);
    }

    public static function deleteEpisode($id) {
        $db = Database::getInstance();
        $episode = $db->findOne('episodes', ['_id' => $id]);
        if (!$episode) {
            http_response_code(404);
            echo json_encode(['message' => 'Episode not found']);
            return;
        }

        $deleted = $db->deleteOne('episodes', ['_id' => $id]);
        if (!$deleted) {
            http_response_code(404);
            echo json_encode(['message' => 'Episode not found']);
            return;
        }

        // Invalidate cache and trigger revalidation
        \Utils\Cache::flush();
        if ($episode && !empty($episode['dramaId'])) {
            \Utils\Cache::delete("drama_detail_" . $episode['dramaId']);
        }
        \Utils\Revalidate::path('/');
        if ($episode && !empty($episode['dramaId'])) {
            self::bumpDramaUpdatedAt($episode['dramaId']);
            $drama = $db->findOne('dramas', ['_id' => $episode['dramaId']]);
            if ($drama && !empty($drama['slug'])) {
                \Utils\Revalidate::media('drama', $drama['slug']);
            }
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Episode deleted successfully']);
    }

    public static function getSubtitleSummaryForDrama($dramaId, $seasons = null, $episodes = null, $allSubtitles = null, $dramaStatus = null) {
        $db = Database::getInstance();
        
        // 1. Get all episodes of the drama (use pre-fetched if available)
        if ($episodes === null) {
            $episodes = $db->find('episodes', ['dramaId' => $dramaId]);
        }
        $totalEpisodesCount = count($episodes);
        
        // 2. Get all approved subtitles for both the drama and its episodes in a single query (use pre-fetched if available)
        if ($allSubtitles === null) {
            $episodeIds = array_map(function($ep) { return $ep['_id']; }, $episodes);
            $allIds = array_merge([$dramaId], $episodeIds);
            
            $allSubtitles = $db->find('subtitles', [
                'mediaId' => ['$in' => $allIds],
                'approvalStatus' => 'Approved'
            ]);
        }
        $totalSubtitles = count($allSubtitles);
        
        if ($totalSubtitles === 0) {
            return [
                'totalSubtitles' => 0,
                'languages' => [],
                'progressLabel' => 'No subs',
                'seasonStatus' => $dramaStatus === 'Upcoming' ? 'Upcoming' : 'Ongoing',
                'latestUploaderRole' => null
            ];
        }
        
        // Split subtitles into title subtitles and episode subtitles
        $titleSubtitles = [];
        $episodeSubtitles = [];
        foreach ($allSubtitles as $sub) {
            if ((string)$sub['mediaId'] === (string)$dramaId) {
                $titleSubtitles[] = $sub;
            } else {
                $episodeSubtitles[] = $sub;
            }
        }
        
        // 4. Languages list
        $languages = [];
        $hasCompleteStatus = false;
        foreach ($allSubtitles as $sub) {
            if (!empty($sub['language']) && !in_array($sub['language'], $languages)) {
                $languages[] = $sub['language'];
            }
            if (isset($sub['seasonStatus']) && $sub['seasonStatus'] === 'Complete') {
                $hasCompleteStatus = true;
            }
        }
        usort($languages, function($a, $b) {
            if ($a === 'Sinhala') return -1;
            if ($b === 'Sinhala') return 1;
            return strcmp($a, $b);
        });
        
        // 5. Determine which episodes have subtitles
        $subbedEpisodes = [];
        foreach ($episodeSubtitles as $sub) {
            $epNum = isset($sub['episodeNumber']) ? (int)$sub['episodeNumber'] : null;
            if ($epNum !== null && !in_array($epNum, $subbedEpisodes)) {
                $subbedEpisodes[] = $epNum;
            }
        }
        
        foreach ($episodeSubtitles as $sub) {
            if (!isset($sub['episodeNumber']) || $sub['episodeNumber'] === null) {
                foreach ($episodes as $ep) {
                    if ($ep['_id'] === $sub['mediaId']) {
                        $epNum = (int)$ep['episodeNumber'];
                        if (!in_array($epNum, $subbedEpisodes)) {
                            $subbedEpisodes[] = $epNum;
                        }
                        break;
                    }
                }
            }
        }
        
        $subbedCount = count($subbedEpisodes);
        $maxEpisodeNumber = !empty($subbedEpisodes) ? max($subbedEpisodes) : 0;
        
        // Determine completed seasons
        $seasons = $db->find('seasons', ['dramaId' => $dramaId]);
        $seasonMap = [];
        foreach ($seasons as $s) {
            $seasonMap[(string)$s['_id']] = (int)($s['seasonNumber'] ?? 1);
        }
        
        $episodesBySeason = [];
        foreach ($episodes as $ep) {
            $sId = (string)($ep['seasonId'] ?? '');
            $sNum = $seasonMap[$sId] ?? 1;
            $episodesBySeason[$sNum][] = $ep;
        }
        
        $subbedEpisodeIds = [];
        foreach ($episodeSubtitles as $sub) {
            $subbedEpisodeIds[(string)$sub['mediaId']] = true;
        }
        
        $completedSeasons = [];
        foreach ($episodesBySeason as $sNum => $eps) {
            $allSubbed = true;
            foreach ($eps as $ep) {
                if (!isset($subbedEpisodeIds[(string)$ep['_id']])) {
                    $allSubbed = false;
                    break;
                }
            }
            if ($allSubbed && !empty($eps)) {
                $completedSeasons[] = $sNum;
            }
        }
        
        $seasonStatus = 'Ongoing';
        $progressLabel = '';
        
        if (!empty($completedSeasons)) {
            $maxCompletedSeason = max($completedSeasons);
            $totalSeasons = count($seasons);
            if ($totalSeasons <= 1) {
                $progressLabel = 'Completed';
            } else {
                $progressLabel = 'S' . str_pad($maxCompletedSeason, 2, '0', STR_PAD_LEFT) . ' Completed';
            }
            if (count($completedSeasons) >= $totalSeasons && $totalSeasons > 0) {
                $seasonStatus = 'Complete';
            }
        } else {
            // Determine which episodes have subtitles
            $subbedEpisodes = [];
            foreach ($episodeSubtitles as $sub) {
                $epNum = isset($sub['episodeNumber']) ? (int)$sub['episodeNumber'] : null;
                if ($epNum !== null && !in_array($epNum, $subbedEpisodes)) {
                    $subbedEpisodes[] = $epNum;
                }
            }
            
            foreach ($episodeSubtitles as $sub) {
                if (!isset($sub['episodeNumber']) || $sub['episodeNumber'] === null) {
                    foreach ($episodes as $ep) {
                        if ($ep['_id'] === $sub['mediaId']) {
                            $epNum = (int)$ep['episodeNumber'];
                            if (!in_array($epNum, $subbedEpisodes)) {
                                $subbedEpisodes[] = $epNum;
                            }
                            break;
                        }
                    }
                }
            }
            
            $subbedCount = count($subbedEpisodes);
            $maxEpisodeNumber = !empty($subbedEpisodes) ? max($subbedEpisodes) : 0;

            if ($totalEpisodesCount === 0 && $hasCompleteStatus) {
                $seasonStatus = 'Complete';
                $progressLabel = 'Completed';
            } else {
                if ($totalEpisodesCount > 0) {
                    $progressLabel = 'EPISODE ' . ($maxEpisodeNumber > 0 ? $maxEpisodeNumber : $subbedCount);
                } elseif ($maxEpisodeNumber > 0) {
                    $progressLabel = 'EPISODE ' . str_pad($maxEpisodeNumber, 2, '0', STR_PAD_LEFT);
                } else {
                    $progressLabel = $totalSubtitles . ' subs';
                }
            }
        }

        // Get the latest approved subtitle's uploader role
        $latestUploaderRole = null;
        if (!empty($allSubtitles)) {
            usort($allSubtitles, function($a, $b) {
                $t1 = isset($a['createdAt']) && is_string($a['createdAt']) ? (strtotime($a['createdAt']) ?: 0) : 0;
                $t2 = isset($b['createdAt']) && is_string($b['createdAt']) ? (strtotime($b['createdAt']) ?: 0) : 0;
                return $t2 <=> $t1;
            });
            $latestUploaderRole = $allSubtitles[0]['uploaderRole'] ?? null;
        }
        
        if ($dramaStatus === 'Upcoming') {
            $seasonStatus = 'Upcoming';
        }
        
        return [
            'totalSubtitles' => $totalSubtitles,
            'languages' => $languages,
            'progressLabel' => $progressLabel,
            'seasonStatus' => $seasonStatus,
            'latestUploaderRole' => $latestUploaderRole
        ];
    }

    public static function appendSubtitleSummariesToDramas(&$dramas) {
        if (empty($dramas)) return;
        $db = Database::getInstance();
        $dramaIds = array_map(function($d) { return $d['_id']; }, $dramas);
        
        // 1. Get all episodes for all these dramas in a single query
        $episodes = $db->find('episodes', ['dramaId' => ['$in' => $dramaIds]]);
        $episodesByDrama = [];
        $episodeIds = [];
        foreach ($episodes as $ep) {
            $episodesByDrama[$ep['dramaId']][] = $ep;
            $episodeIds[] = $ep['_id'];
        }

        // Get all seasons for these dramas
        $seasons = $db->find('seasons', ['dramaId' => ['$in' => $dramaIds]]);
        $seasonsByDrama = [];
        foreach ($seasons as $s) {
            $seasonsByDrama[$s['dramaId']][] = $s;
        }
        
        // 2. Get all approved subtitles for all these dramas in a single query
        $allSubtitles = $db->find('subtitles', [
            'mediaId' => ['$in' => array_merge($dramaIds, $episodeIds)],
            'approvalStatus' => 'Approved'
        ]);
        
        // Group subtitles by mediaId
        $subtitlesByMedia = [];
        foreach ($allSubtitles as $sub) {
            $subtitlesByMedia[$sub['mediaId']][] = $sub;
        }
        
        // Find latest 5 published dramas
        $latestDramas = $db->find('dramas', ['status' => 'Published'], ['sort' => ['createdAt' => -1], 'limit' => 5]);
        $latestIds = array_map(function($ld) { return (string)$ld['_id']; }, $latestDramas);
        
        // 3. For each drama, compute the summary using the pre-fetched data
        foreach ($dramas as &$drama) {
            $dId = $drama['_id'];
            // Never use generic updatedAt here: detail-page view tracking can
            // update it even though no catalog content changed.
            $drama['contentUpdatedAt'] = $drama['contentUpdatedAt'] ?? $drama['createdAt'] ?? null;
            $drama['isNew'] = in_array((string)$dId, $latestIds);
            
            $dramaEps = $episodesByDrama[$dId] ?? [];
            $totalEpisodesCount = count($dramaEps);
            $drama['episodeCount'] = $totalEpisodesCount;
            $drama['seasonCount'] = count($seasonsByDrama[$dId] ?? []);
            
            $titleSubbed = $subtitlesByMedia[$dId] ?? [];
            
            $epSubbed = [];
            $dramaEpIds = array_map(function($ep) { return $ep['_id']; }, $dramaEps);
            foreach ($dramaEpIds as $epId) {
                if (isset($subtitlesByMedia[$epId])) {
                    $epSubbed = array_merge($epSubbed, $subtitlesByMedia[$epId]);
                }
            }
            
            $dramaSubs = array_merge($titleSubbed, $epSubbed);
            $totalSubtitles = count($dramaSubs);

            foreach ($dramaSubs as $sub) {
                $subtitleCreatedAt = $sub['createdAt'] ?? null;
                if ($subtitleCreatedAt && (!$drama['contentUpdatedAt'] || strtotime($subtitleCreatedAt) > strtotime($drama['contentUpdatedAt']))) {
                    $drama['contentUpdatedAt'] = $subtitleCreatedAt;
                }
            }
            
            if ($totalSubtitles === 0) {
                $drama['subtitleSummary'] = [
                    'totalSubtitles' => 0,
                    'languages' => [],
                    'progressLabel' => 'No subs',
                    'seasonStatus' => ($drama['status'] ?? '') === 'Upcoming' ? 'Upcoming' : 'Ongoing',
                    'latestUploaderRole' => null
                ];
                continue;
            }
            
            $languages = [];
            $hasCompleteStatus = false;
            foreach ($dramaSubs as $sub) {
                if (!empty($sub['language']) && !in_array($sub['language'], $languages)) {
                    $languages[] = $sub['language'];
                }
                if (isset($sub['seasonStatus']) && $sub['seasonStatus'] === 'Complete') {
                    $hasCompleteStatus = true;
                }
            }
            usort($languages, function($a, $b) {
                if ($a === 'Sinhala') return -1;
                if ($b === 'Sinhala') return 1;
                return strcmp($a, $b);
            });
            
            // Determine completed seasons
            $dramaSeasons = $seasonsByDrama[$dId] ?? [];
            $seasonMap = [];
            foreach ($dramaSeasons as $s) {
                $seasonMap[(string)$s['_id']] = (int)($s['seasonNumber'] ?? 1);
            }
            
            $episodesBySeason = [];
            foreach ($dramaEps as $ep) {
                $sId = (string)($ep['seasonId'] ?? '');
                $sNum = $seasonMap[$sId] ?? 1;
                $episodesBySeason[$sNum][] = $ep;
            }
            
            $subbedEpisodeIds = [];
            foreach ($epSubbed as $sub) {
                $subbedEpisodeIds[(string)$sub['mediaId']] = true;
            }
            
            $completedSeasons = [];
            foreach ($episodesBySeason as $sNum => $eps) {
                $allSubbed = true;
                foreach ($eps as $ep) {
                    if (!isset($subbedEpisodeIds[(string)$ep['_id']])) {
                        $allSubbed = false;
                        break;
                    }
                }
                if ($allSubbed && !empty($eps)) {
                    $completedSeasons[] = $sNum;
                }
            }
            
            $seasonStatus = ($drama['status'] ?? '') === 'Upcoming' ? 'Upcoming' : 'Ongoing';
            $progressLabel = '';
            
            if (!empty($completedSeasons)) {
                $maxCompletedSeason = max($completedSeasons);
                $totalSeasons = count($dramaSeasons);
                if ($totalSeasons <= 1) {
                    $progressLabel = 'Completed';
                } else {
                    $progressLabel = 'S' . str_pad($maxCompletedSeason, 2, '0', STR_PAD_LEFT) . ' Completed';
                }
                if (count($completedSeasons) >= $totalSeasons && $totalSeasons > 0) {
                    $seasonStatus = 'Complete';
                }
            } else {
                $subbedEpisodes = [];
                foreach ($epSubbed as $sub) {
                    $epNum = isset($sub['episodeNumber']) ? (int)$sub['episodeNumber'] : null;
                    if ($epNum !== null && !in_array($epNum, $subbedEpisodes)) {
                        $subbedEpisodes[] = $epNum;
                    }
                }
                
                foreach ($epSubbed as $sub) {
                    if (!isset($sub['episodeNumber']) || $sub['episodeNumber'] === null) {
                        foreach ($dramaEps as $ep) {
                            if ($ep['_id'] === $sub['mediaId']) {
                                $epNum = (int)$ep['episodeNumber'];
                                if (!in_array($epNum, $subbedEpisodes)) {
                                    $subbedEpisodes[] = $epNum;
                                }
                                break;
                            }
                        }
                    }
                }
                
                $subbedCount = count($subbedEpisodes);
                $maxEpisodeNumber = !empty($subbedEpisodes) ? max($subbedEpisodes) : 0;
                
                if ($totalEpisodesCount === 0 && $hasCompleteStatus) {
                    $seasonStatus = 'Complete';
                    $progressLabel = 'Completed';
                } else {
                    if ($totalEpisodesCount > 0) {
                        $progressLabel = 'EPISODE ' . ($maxEpisodeNumber > 0 ? $maxEpisodeNumber : $subbedCount);
                    } elseif ($maxEpisodeNumber > 0) {
                        $progressLabel = 'EPISODE ' . str_pad($maxEpisodeNumber, 2, '0', STR_PAD_LEFT);
                    } else {
                        $progressLabel = $totalSubtitles . ' subs';
                    }
                }
            }
            
            $latestUploaderRole = null;
            if (!empty($dramaSubs)) {
                usort($dramaSubs, function($a, $b) {
                    $t1 = isset($a['createdAt']) && is_string($a['createdAt']) ? (strtotime($a['createdAt']) ?: 0) : 0;
                    $t2 = isset($b['createdAt']) && is_string($b['createdAt']) ? (strtotime($b['createdAt']) ?: 0) : 0;
                    return $t2 <=> $t1;
                });
                $latestUploaderRole = $dramaSubs[0]['uploaderRole'] ?? null;
            }
            
            $drama['subtitleSummary'] = [
                'totalSubtitles' => $totalSubtitles,
                'languages' => $languages,
                'progressLabel' => $progressLabel,
                'seasonStatus' => $seasonStatus,
                'latestUploaderRole' => $latestUploaderRole
            ];
        }
    }

    public static function bumpDramaUpdatedAt($dramaId) {
        try {
            $db = Database::getInstance();
            $now = date('Y-m-d H:i:s');
            $db->updateOne('dramas', ['_id' => $dramaId], [
                'updatedAt' => $now,
                'contentUpdatedAt' => gmdate(DATE_ATOM)
            ]);
        } catch (\Exception $e) {
            error_log("Failed to bump drama updatedAt: " . $e->getMessage());
        }
    }
}
