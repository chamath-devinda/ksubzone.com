<?php
namespace Controllers;

use Config\Database;

class AnalyticsController {
    private static function getOrCreateRecord() {
        $db = Database::getInstance();
        $record = $db->findOne('analytics');
        if (!$record) {
            $record = [
                'seoHealthScore' => 98,
                'trafficLogs' => [
                    ['date' => '2026-05-18', 'views' => 120, 'uniqueVisitors' => 80],
                    ['date' => '2026-05-19', 'views' => 240, 'uniqueVisitors' => 150],
                    ['date' => '2026-05-20', 'views' => 310, 'uniqueVisitors' => 190],
                    ['date' => '2026-05-21', 'views' => 420, 'uniqueVisitors' => 280],
                    ['date' => '2026-05-22', 'views' => 530, 'uniqueVisitors' => 360]
                ],
                'trendingSearches' => []
            ];
            $record = $db->insertOne('analytics', $record);
        }
        return $record;
    }

    private static function populateSubtitleDetails($subtitles) {
        $db = Database::getInstance();
        $uploaderIds = [];
        $movieIds = [];
        $dramaIds = [];
        $episodeIds = [];
        foreach ($subtitles as $sub) {
            if (!empty($sub['uploader'])) $uploaderIds[] = $sub['uploader'];
            $mediaId = $sub['mediaId'] ?? null;
            if (!$mediaId) continue;
            $mediaType = strtolower($sub['mediaType'] ?? '');
            if ($mediaType === 'episode') $episodeIds[] = $mediaId;
            elseif ($mediaType === 'movie') $movieIds[] = $mediaId;
            else $dramaIds[] = $mediaId;
        }

        $userMap = [];
        $uploaderIds = array_values(array_unique($uploaderIds));
        if (!empty($uploaderIds)) {
            foreach ($db->find('users', ['_id' => ['$in' => $uploaderIds]]) as $user) {
                $userMap[(string)$user['_id']] = [
                    '_id' => $user['_id'],
                    'username' => $user['username'] ?? 'Translator',
                    'avatar' => $user['avatar'] ?? ''
                ];
            }
        }

        $episodeMap = [];
        $episodeIds = array_values(array_unique($episodeIds));
        if (!empty($episodeIds)) {
            foreach ($db->find('episodes', ['_id' => ['$in' => $episodeIds]]) as $episode) {
                $episodeMap[(string)$episode['_id']] = $episode;
                if (!empty($episode['dramaId'])) $dramaIds[] = $episode['dramaId'];
            }
        }

        $movieMap = [];
        $movieIds = array_values(array_unique($movieIds));
        if (!empty($movieIds)) {
            foreach ($db->find('movies', ['_id' => ['$in' => $movieIds]]) as $movie) {
                $movieMap[(string)$movie['_id']] = $movie;
            }
        }

        $dramaMap = [];
        $dramaIds = array_values(array_unique($dramaIds));
        if (!empty($dramaIds)) {
            foreach ($db->find('dramas', ['_id' => ['$in' => $dramaIds]]) as $drama) {
                $dramaMap[(string)$drama['_id']] = $drama;
            }
        }

        $populated = [];
        foreach ($subtitles as $sub) {
            $uploaderId = (string)($sub['uploader'] ?? '');
            $sub['uploader'] = $uploaderId !== '' ? ($userMap[$uploaderId] ?? null) : null;

            $mediaId = (string)($sub['mediaId'] ?? '');
            $mediaType = strtolower($sub['mediaType'] ?? '');
            $media = null;
            $mediaTitle = '';
            if ($mediaType === 'episode') {
                $episode = $episodeMap[$mediaId] ?? null;
                $media = $episode ? ($dramaMap[(string)($episode['dramaId'] ?? '')] ?? null) : null;
                if ($media) {
                    $mediaTitle = ($media['title'] ?? '') . ' (S' . ($episode['seasonNumber'] ?? 1) . ' E' . ($episode['episodeNumber'] ?? 1) . ')';
                }
                $mediaType = 'drama';
            } elseif ($mediaType === 'movie') {
                $media = $movieMap[$mediaId] ?? null;
                $mediaTitle = $media['title'] ?? '';
            } else {
                $media = $dramaMap[$mediaId] ?? null;
                $mediaTitle = $media['title'] ?? '';
                $mediaType = 'drama';
            }

            $sub['media'] = [
                'title' => $mediaTitle,
                'slug' => $media['slug'] ?? '',
                'type' => $mediaType
            ];
            $populated[] = $sub;
        }
        return $populated;
    }

    public static function getDashboardStats() {
        $cached = \Utils\Cache::get('admin_dashboard_v2');
        if ($cached !== false) {
            header('Content-Type: application/json');
            echo json_encode($cached);
            return;
        }

        $db = Database::getInstance();
        
        $totalMovies = $db->count('movies');
        $totalDramas = $db->count('dramas');
        $totalEpisodes = $db->count('episodes');
        $totalUsers = $db->count('users');
        $totalSubtitles = $db->count('subtitles');
        $totalReviews = $db->count('reviews');

        $movieViews = $db->sumJsonField('movies', 'viewCount');
        $dramaViews = $db->sumJsonField('dramas', 'viewCount');
        $totalDownloads = $db->sumJsonField('subtitles', 'downloads');

        $analyticsRecord = self::getOrCreateRecord();

        $trafficViews = 0;
        if (isset($analyticsRecord['trafficLogs']) && is_array($analyticsRecord['trafficLogs'])) {
            foreach ($analyticsRecord['trafficLogs'] as $log) {
                $trafficViews += ($log['views'] ?? 0);
            }
        }

        // Total views = content views (movies + dramas) + site traffic views
        $totalViews = $movieViews + $dramaViews + $trafficViews;

        // Subtitle moderation stats
        $pendingSubtitles   = $db->count('subtitles', ['approvalStatus' => 'Pending']);
        $approvedSubtitles  = $db->count('subtitles', ['approvalStatus' => 'Approved']);
        $rejectedSubtitles  = $db->count('subtitles', ['approvalStatus' => 'Rejected']);

        // System health snapshot
        $systemHealth = [
            'dbDriver'   => $db->getDriver(),
            'serverTime' => date('Y-m-d H:i:s'),
            'phpVersion' => PHP_VERSION,
            'dbStatus'   => 'ok',
            'timezone'   => date_default_timezone_get()
        ];

        // Top viewed movies & dramas (limit 8 total for richer list)
        $topMovies = $db->find('movies', [], ['sort' => ['viewCount' => -1], 'limit' => 5]);
        $topDramas = $db->find('dramas', [], ['sort' => ['viewCount' => -1], 'limit' => 5]);

        $topContent = [];
        foreach ($topMovies as $m) {
            $topContent[] = [
                '_id'        => $m['_id'],
                'title'      => $m['title'],
                'slug'       => $m['slug'],
                'poster'     => $m['poster'] ?? null,
                'isTrending' => $m['isTrending'] ?? false,
                'status'     => $m['status'] ?? 'Published',
                'viewCount'  => $m['viewCount'] ?? 0,
                'tmdbRating' => $m['tmdbRating'] ?? 0,
                'type'       => 'Movie'
            ];
        }
        foreach ($topDramas as $d) {
            $topContent[] = [
                '_id'        => $d['_id'],
                'title'      => $d['title'],
                'slug'       => $d['slug'],
                'poster'     => $d['poster'] ?? null,
                'isTrending' => $d['isTrending'] ?? false,
                'status'     => $d['status'] ?? 'Published',
                'viewCount'  => $d['viewCount'] ?? 0,
                'tmdbRating' => $d['tmdbRating'] ?? 0,
                'type'       => 'Drama'
            ];
        }

        // Sort topContent by viewCount DESC
        usort($topContent, function($a, $b) {
            $c1 = (int)($a['viewCount'] ?? 0);
            $c2 = (int)($b['viewCount'] ?? 0);
            return $c2 <=> $c1;
        });

        // Episode subtitle notifications:
        // Show ALL ongoing drama episodes that have NO subtitles — aired in last 30 days OR upcoming
        $nowStr = date('Y-m-d H:i:s');
        $thirtyDaysAgo = date('Y-m-d H:i:s', strtotime('-30 days'));

        // Find all ongoing dramas (status = Published, subtitleSummary.seasonStatus = Ongoing, OR just all published dramas)
        $ongoingDramas = $db->find('dramas', ['status' => 'Published'], ['sort' => ['createdAt' => -1], 'limit' => 100]);
        $ongoingDramaIds = array_map(function($d) { return $d['_id']; }, $ongoingDramas);

        // Build a dramaMap for title/slug lookup
        $dramaMap = [];
        foreach ($ongoingDramas as $d) {
            $dramaMap[(string)$d['_id']] = ['title' => $d['title'], 'slug' => $d['slug']];
        }

        // Get all episodes for these dramas that either:
        //   (a) have a future airDate (upcoming)
        //   (b) have an airDate within the last 30 days (recently aired but may lack subs)
        //   (c) have no airDate at all (always show as needing attention)
        $allNotifiableEps = [];
        if (!empty($ongoingDramaIds)) {
            // Upcoming episodes
            $upcomingEps = $db->find('episodes', [
                'dramaId' => ['$in' => $ongoingDramaIds],
                'airDate' => ['$gt' => $nowStr]
            ], ['sort' => ['airDate' => 1], 'limit' => 30]);

            // Recently aired episodes (last 30 days)
            $recentEps = $db->find('episodes', [
                'dramaId' => ['$in' => $ongoingDramaIds],
                'airDate' => ['$gte' => $thirtyDaysAgo, '$lte' => $nowStr]
            ], ['sort' => ['airDate' => -1], 'limit' => 30]);

            // Merge and deduplicate by _id
            $seen = [];
            foreach (array_merge($recentEps, $upcomingEps) as $ep) {
                $eid = (string)$ep['_id'];
                if (!isset($seen[$eid])) {
                    $seen[$eid] = true;
                    $allNotifiableEps[] = $ep;
                }
            }
        }

        // Check which of these have approved subtitles
        $notifEpIds = array_map(function($ep) { return $ep['_id']; }, $allNotifiableEps);
        $epSubtitles = !empty($notifEpIds) ? $db->find('subtitles', [
            'mediaId' => ['$in' => $notifEpIds],
            'approvalStatus' => 'Approved'
        ]) : [];
        $subbedEpIds = [];
        foreach ($epSubtitles as $sub) {
            $subbedEpIds[(string)$sub['mediaId']] = true;
        }

        // Build notification list — prioritize missing-sub episodes first, then sort by airDate
        $upcomingEpisodes = [];
        foreach ($allNotifiableEps as $ep) {
            $drama = $dramaMap[(string)$ep['dramaId']] ?? null;
            $hasSubtitles = isset($subbedEpIds[(string)$ep['_id']]);
            $upcomingEpisodes[] = [
                '_id' => $ep['_id'],
                'episodeNumber' => $ep['episodeNumber'],
                'episodeTitle' => $ep['episodeTitle'] ?? '',
                'airDate' => $ep['airDate'] ?? null,
                'dramaTitle' => $drama['title'] ?? 'Unknown Drama',
                'dramaSlug' => $drama['slug'] ?? '',
                'hasSubtitles' => $hasSubtitles,
                'isUpcoming' => isset($ep['airDate']) && $ep['airDate'] > $nowStr
            ];
        }

        // Sort: no-subtitle episodes first, then by airDate desc
        usort($upcomingEpisodes, function($a, $b) {
            if ($a['hasSubtitles'] !== $b['hasSubtitles']) {
                return $a['hasSubtitles'] ? 1 : -1; // missing subs first
            }
            $aDate = $a['airDate'] ?? '';
            $bDate = $b['airDate'] ?? '';
            return strcmp($bDate, $aDate); // newer first
        });

        // Limit to 25 most relevant
        $upcomingEpisodes = array_slice($upcomingEpisodes, 0, 25);

        // Fetch top downloaded and latest downloaded subtitles
        $mostDownloadedRaw = $db->find('subtitles', [
            'approvalStatus' => 'Approved',
            'downloads' => ['$gt' => 0]
        ], [
            'sort' => ['downloads' => -1],
            'limit' => 10
        ]);
        $latestDownloadsRaw = $db->find('subtitles', [
            'approvalStatus' => 'Approved',
            'lastDownloadedAt' => ['$gt' => '']
        ], [
            'sort' => ['lastDownloadedAt' => -1],
            'limit' => 10
        ]);
        $mostDownloadedCount = count($mostDownloadedRaw);
        $populatedDownloads = self::populateSubtitleDetails(array_merge($mostDownloadedRaw, $latestDownloadsRaw));
        $mostDownloaded = array_slice($populatedDownloads, 0, $mostDownloadedCount);
        $latestDownloads = array_slice($populatedDownloads, $mostDownloadedCount);

        $payload = [
            'counts' => [
                'totalMovies'       => $totalMovies,
                'totalDramas'       => $totalDramas,
                'totalEpisodes'     => $totalEpisodes,
                'totalUsers'        => $totalUsers,
                'totalSubtitles'    => $totalSubtitles,
                'totalReviews'      => $totalReviews,
                'totalViews'        => $totalViews,
                'totalTrafficViews' => $trafficViews,
                'totalDownloads'    => $totalDownloads
            ],
            'seoHealthScore'   => $analyticsRecord['seoHealthScore'] ?? 98,
            'trafficLogs'      => $analyticsRecord['trafficLogs'] ?? [],
            'trendingSearches' => $analyticsRecord['trendingSearches'] ?? [],
            'topContent'       => $topContent,
            'upcomingEpisodes' => $upcomingEpisodes,
            'mostDownloaded'   => $mostDownloaded,
            'latestDownloads'  => $latestDownloads,
            'subtitleStats'    => [
                'pending'  => $pendingSubtitles,
                'approved' => $approvedSubtitles,
                'rejected' => $rejectedSubtitles
            ],
            'systemHealth' => $systemHealth
        ];

        \Utils\Cache::set('admin_dashboard_v2', $payload, 60);
        header('Content-Type: application/json');
        echo json_encode($payload);
    }

    public static function logPageVisit() {
        $isExplicitApiRequest = strpos($_SERVER['REQUEST_URI'] ?? '', '/api/analytics/visit') !== false;
        if ($isExplicitApiRequest && !\Utils\VisitorGuard::shouldCount('api_visit')) {
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Already counted today']);
            return;
        }

        $todayStr = date('Y-m-d');
        $db = Database::getInstance();
        $record = self::getOrCreateRecord();

        $logs    = $record['trafficLogs'] ?? [];
        $logIndex = -1;
        foreach ($logs as $idx => $log) {
            if ($log['date'] === $todayStr) {
                $logIndex = $idx;
                break;
            }
        }

        if ($logIndex > -1) {
            // Both views and uniqueVisitors increment together because
            // VisitorGuard already deduplicates — each call here = 1 unique visit.
            $logs[$logIndex]['views']          = ($logs[$logIndex]['views']          ?? 0) + 1;
            $logs[$logIndex]['uniqueVisitors'] = ($logs[$logIndex]['uniqueVisitors'] ?? 0) + 1;
        } else {
            $logs[] = ['date' => $todayStr, 'views' => 1, 'uniqueVisitors' => 1];
        }

        $db->updateOne('analytics', ['_id' => $record['_id']], ['trafficLogs' => $logs]);

        // When called via the explicit API endpoint (not just middleware hook)
        if ($isExplicitApiRequest) {
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Visit logged successfully']);
        }
    }

    public static function logSearchQuery($queryStr) {
        if (empty($queryStr) || trim($queryStr) === '') return;
        $queryStr = trim($queryStr);

        $db = Database::getInstance();
        $record = self::getOrCreateRecord();

        $searches = $record['trendingSearches'] ?? [];
        $searchIndex = -1;
        foreach ($searches as $idx => $s) {
            if (strtolower($s['query']) === strtolower($queryStr)) {
                $searchIndex = $idx;
                break;
            }
        }

        if ($searchIndex > -1) {
            $searches[$searchIndex]['count'] += 1;
            $searches[$searchIndex]['lastSearched'] = date('Y-m-d H:i:s');
        } else {
            $searches[] = ['query' => $queryStr, 'count' => 1, 'lastSearched' => date('Y-m-d H:i:s')];
        }

        // Sort descending by count
        usort($searches, function($a, $b) {
            $c1 = (int)($a['count'] ?? 0);
            $c2 = (int)($b['count'] ?? 0);
            return $c2 <=> $c1;
        });

        // Limit to 15 searches
        if (count($searches) > 15) {
            array_pop($searches);
        }

        $db->updateOne('analytics', ['_id' => $record['_id']], ['trendingSearches' => $searches]);
    }

    public static function logSearchQueryRequest() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $query = $body['query'] ?? '';

        if (empty($query) || trim($query) === '') {
            http_response_code(400);
            echo json_encode(['message' => 'Search query is required']);
            return;
        }

        self::logSearchQuery($query);

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Search query logged']);
    }
}
