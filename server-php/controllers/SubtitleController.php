<?php
namespace Controllers;

use Config\Database;
use Middleware\AuthMiddleware;

class SubtitleController {
    public static function uploadSubtitle() {
        // Phase 4: Early Authentication & Permission verification
        $user = AuthMiddleware::$currentUser;
        $admin = AuthMiddleware::$currentAdmin;

        if ($admin) {
            $uploaderId = $admin['_id'];
            $uploaderRole = 'Admin';
            $approvalStatus = 'Approved';
        } else if ($user) {
            $uploaderId = $user['_id'];
            $uploaderRole = 'User';
            $approvalStatus = 'Pending';
        } else {
            http_response_code(401);
            echo json_encode(['message' => 'Please sign in before uploading subtitles']);
            return;
        }

        $mediaId = trim((string)($_POST['mediaId'] ?? ''));
        $mediaType = trim((string)($_POST['mediaType'] ?? ''));
        $language = trim((string)($_POST['language'] ?? ''));
        $version = trim((string)($_POST['version'] ?? '1.0'));
        $releaseNotes = trim((string)($_POST['releaseNotes'] ?? ''));
        $seasonNumber = isset($_POST['seasonNumber']) && $_POST['seasonNumber'] !== '' ? (int)$_POST['seasonNumber'] : null;
        $episodeNumber = isset($_POST['episodeNumber']) && $_POST['episodeNumber'] !== '' ? (int)$_POST['episodeNumber'] : null;
        $seasonStatus = ($_POST['seasonStatus'] ?? 'Ongoing') === 'Complete' ? 'Complete' : 'Ongoing';

        if (!isset($_FILES['subtitle'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Subtitle file is required']);
            return;
        }

        $file = $_FILES['subtitle'];
        if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['message' => 'Error uploading file. Code: ' . ($file['error'] ?? 'unknown')]);
            return;
        }

        if (empty($mediaId) || empty($mediaType) || empty($language)) {
            http_response_code(400);
            echo json_encode(['message' => 'Media ID, Media Type (Movie/Drama/Episode), and Language are required']);
            return;
        }

        if (!in_array($language, ['Sinhala', 'English'], true)) {
            http_response_code(400);
            echo json_encode(['message' => 'Only Sinhala and English subtitles are supported']);
            return;
        }

        // Validate file format and size (< 10MB)
        $fileValidation = \Utils\Storage::validateSubtitleFile($file);
        if (!$fileValidation['valid']) {
            http_response_code(400);
            echo json_encode(['message' => $fileValidation['error']]);
            return;
        }

        $checksum = @hash_file('sha256', $file['tmp_name']);
        $db = Database::getInstance();

        // Exact duplicate prevention
        if ($checksum) {
            $duplicate = $db->findOne('subtitles', [
                'fileChecksum' => $checksum,
                'mediaId' => $mediaId,
                'language' => $language
            ]);
            if ($duplicate) {
                http_response_code(409);
                echo json_encode(['message' => 'An identical subtitle already exists for this title and language.']);
                return;
            }
        }

        // Resolve media slug for safe lowercase object key generation
        $mediaSlug = 'untitled';
        $mediaTitle = '';
        if (strtolower($mediaType) === 'episode') {
            $episode = $db->findOne('episodes', ['_id' => $mediaId]);
            if ($episode && !empty($episode['dramaId'])) {
                $drama = $db->findOne('dramas', ['_id' => $episode['dramaId']]);
                if ($drama) {
                    $mediaSlug = $drama['slug'] ?? \Utils\Slug::slugify($drama['title'] ?? '');
                    $mediaTitle = $drama['title'] ?? '';
                }
            }
            if ($seasonNumber === null && $episode) $seasonNumber = (int)($episode['seasonNumber'] ?? 1);
            if ($episodeNumber === null && $episode) $episodeNumber = (int)($episode['episodeNumber'] ?? 1);
        } elseif (strtolower($mediaType) === 'movie') {
            $movie = $db->findOne('movies', ['_id' => $mediaId]);
            if ($movie) {
                $mediaSlug = $movie['slug'] ?? \Utils\Slug::slugify($movie['title'] ?? '');
                $mediaTitle = $movie['title'] ?? '';
            }
        } else {
            $drama = $db->findOne('dramas', ['_id' => $mediaId]);
            if ($drama) {
                $mediaSlug = $drama['slug'] ?? \Utils\Slug::slugify($drama['title'] ?? '');
                $mediaTitle = $drama['title'] ?? '';
            }
        }

        // Phase 5 & 7: Two-step upload transaction to Cloudflare R2 / Storage
        $context = [
            'mediaSlug' => $mediaSlug,
            'mediaTitle' => $mediaTitle,
            'mediaType' => $mediaType,
            'seasonNumber' => $seasonNumber,
            'episodeNumber' => $episodeNumber,
            'language' => $language,
            'version' => $version,
            'originalFilename' => $fileValidation['originalFilename']
        ];

        $uploadMeta = \Utils\Storage::uploadSubtitle($file, $context);
        if (!$uploadMeta || empty($uploadMeta['url'])) {
            http_response_code(500);
            echo json_encode(['message' => 'Failed to save subtitle file to storage provider.']);
            return;
        }

        $fileUrl = $uploadMeta['url'];
        $ext = $fileValidation['ext'];

        $subtitle = [
            'mediaId' => $mediaId,
            'mediaType' => $mediaType,
            'language' => $language,
            'version' => $version,
            'uploader' => $uploaderRole === 'User' ? $uploaderId : null,
            'adminUploader' => $uploaderRole === 'Admin' ? $uploaderId : null,
            'uploaderRole' => $uploaderRole,
            'seasonNumber' => $seasonNumber,
            'episodeNumber' => $episodeNumber,
            'seasonStatus' => $seasonStatus,
            'fileUrl' => $fileUrl,
            'format' => $ext,
            'downloads' => 0,
            'rating' => 0,
            'ratings' => [],
            'approvalStatus' => $approvalStatus,
            'releaseNotes' => $releaseNotes,
            'storageProvider' => $uploadMeta['provider'] ?? 'r2',
            'storageBucket' => $uploadMeta['bucket'] ?? null,
            'storageObjectKey' => $uploadMeta['objectKey'] ?? null,
            'originalFilename' => $uploadMeta['originalFilename'] ?? $fileValidation['originalFilename'],
            'storedFilename' => basename($uploadMeta['objectKey'] ?? $fileUrl),
            'fileSizeBytes' => $uploadMeta['sizeBytes'] ?? $fileValidation['size'],
            'fileChecksum' => $uploadMeta['checksum'] ?? $checksum,
            'mimeType' => $uploadMeta['mimeType'] ?? $fileValidation['mime'],
            'uploadedAt' => $uploadMeta['uploadedAt'] ?? date('Y-m-d H:i:s'),
            'createdAt' => date('Y-m-d H:i:s'),
            'updatedAt' => date('Y-m-d H:i:s')
        ];

        try {
            $inserted = $db->insertOne('subtitles', $subtitle);
            if (!$inserted) {
                throw new \Exception('Database insert returned empty result');
            }
        } catch (\Throwable $e) {
            // Transaction Rollback: delete the newly uploaded object from R2
            error_log('Database insert failed. Rolling back uploaded storage object: ' . $e->getMessage());
            \Utils\Storage::rollbackUpload($uploadMeta['provider'], $uploadMeta['objectKey'] ?? '');
            http_response_code(500);
            echo json_encode(['message' => 'Failed to record subtitle in database. Storage upload was rolled back.']);
            return;
        }

        if ($uploaderRole === 'User') {
            $db->insertOne('notifications', [
                'recipientType' => 'Admin',
                'title' => 'New Subtitle Pending Approval',
                'message' => "User {$user['username']} uploaded a new {$language} subtitle for {$mediaType} ID: {$mediaId}",
                'type' => 'system',
                'isRead' => false
            ]);
        }

        // Clear PHP caches and update the parent media timestamp before the
        // success response. Remote Next.js revalidation itself remains queued
        // for shutdown, so the upload stays fast while the next API read is
        // guaranteed to see the new subtitle immediately.
        if ($approvalStatus === 'Approved') {
            self::triggerCacheRevalidation($mediaId, $mediaType, true);
        }

        http_response_code(201);
        header('Content-Type: application/json');
        echo json_encode([
            'message' => $uploaderRole === 'Admin'
                ? 'Admin subtitle uploaded and published successfully.'
                : 'Subtitle uploaded successfully. Pending moderator approval.',
            'subtitle' => [
                '_id' => $inserted['_id'] ?? null,
                'fileUrl' => $fileUrl,
                'storageProvider' => $subtitle['storageProvider'],
                'storageObjectKey' => $subtitle['storageObjectKey'],
                'mediaId' => $mediaId,
                'mediaType' => $mediaType,
                'approvalStatus' => $approvalStatus,
                'language' => $language,
                'version' => $version
            ]
        ]);
    }

    public static function fetchSubtitlesForMediaWithBatchPopulate($mediaId) {
        $db = Database::getInstance();

        $query = ['approvalStatus' => 'Approved'];
        if (strpos($mediaId, ',') !== false) {
            $ids = explode(',', $mediaId);
            $query['mediaId'] = ['$in' => $ids];
        } else {
            $query['mediaId'] = $mediaId;
        }

        $subtitles = $db->find('subtitles', $query, ['sort' => ['downloads' => -1, 'rating' => -1]]);

        // Gather unique uploader IDs
        $uploaderIds = [];
        foreach ($subtitles as $sub) {
            $uId = $sub['uploader'] ?? null;
            if ($uId) {
                $uploaderIds[] = $uId;
            }
        }
        $uploaderIds = array_values(array_unique($uploaderIds));

        // Batch fetch users
        $userMap = [];
        if (!empty($uploaderIds)) {
            $users = $db->find('users', ['_id' => ['$in' => $uploaderIds]]);
            foreach ($users as $u) {
                $userMap[$u['_id']] = [
                    '_id' => $u['_id'],
                    'username' => $u['username'],
                    'avatar' => $u['avatar'] ?? ''
                ];
            }
        }

        // Populate uploader details using map
        foreach ($subtitles as &$sub) {
            $uId = $sub['uploader'] ?? null;
            $sub['uploader'] = $uId ? ($userMap[$uId] ?? null) : null;
        }

        return $subtitles;
    }

    public static function getSubtitlesForMedia($mediaId) {
        $cacheKey = 'media_subtitles_v2_' . md5($mediaId);
        $cached = \Utils\Cache::get($cacheKey);
        if ($cached !== false) {
            header('Content-Type: application/json');
            echo json_encode($cached);
            return;
        }

        $subtitles = self::fetchSubtitlesForMediaWithBatchPopulate($mediaId);
        \Utils\Cache::set($cacheKey, $subtitles, 120);
        header('Content-Type: application/json');
        echo json_encode($subtitles);
    }

    public static function getRecentApprovedSubtitles() {
        $limit = max(1, min((int)($_GET['limit'] ?? 4), 20));
        $cacheKey = 'recent_subtitles_v2_' . $limit;
        $cached = \Utils\Cache::get($cacheKey);
        if ($cached !== false) {
            header('Content-Type: application/json');
            echo json_encode($cached);
            return;
        }

        $db = Database::getInstance();
        $subtitles = $db->find('subtitles', [
            'approvalStatus' => 'Approved'
        ], [
            'sort' => ['createdAt' => -1],
            'limit' => $limit
        ]);

        // Batch all related documents. The previous per-subtitle lookups made
        // a four-item homepage widget issue up to twelve remote DB queries.
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

        $uploaderIds = array_values(array_unique($uploaderIds));
        $movieIds = array_values(array_unique($movieIds));
        $dramaIds = array_values(array_unique($dramaIds));
        $episodeIds = array_values(array_unique($episodeIds));

        $userMap = [];
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
        if (!empty($episodeIds)) {
            foreach ($db->find('episodes', ['_id' => ['$in' => $episodeIds]]) as $episode) {
                $episodeMap[(string)$episode['_id']] = $episode;
                if (!empty($episode['dramaId'])) $dramaIds[] = $episode['dramaId'];
            }
        }

        $movieMap = [];
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

        foreach ($subtitles as &$sub) {
            $uploaderId = (string)($sub['uploader'] ?? '');
            $sub['uploader'] = $uploaderId !== '' ? ($userMap[$uploaderId] ?? null) : null;

            $mediaId = (string)($sub['mediaId'] ?? '');
            $mediaType = strtolower($sub['mediaType'] ?? '');
            $media = null;
            if ($mediaType === 'episode') {
                $episode = $episodeMap[$mediaId] ?? null;
                $media = $episode ? ($dramaMap[(string)($episode['dramaId'] ?? '')] ?? null) : null;
                $mediaType = 'drama';
            } elseif ($mediaType === 'movie') {
                $media = $movieMap[$mediaId] ?? null;
            } else {
                $media = $dramaMap[$mediaId] ?? null;
                $mediaType = 'drama';
            }

            $sub['media'] = [
                'title' => $media['title'] ?? '',
                'slug' => $media['slug'] ?? '',
                'type' => $mediaType
            ];
        }
        unset($sub);

        \Utils\Cache::set($cacheKey, $subtitles, 300);
        header('Content-Type: application/json');
        echo json_encode($subtitles);
    }

    public static function trackDownload($id) {
        if (\Utils\VisitorGuard::isBot()) {
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Bot download skipped']);
            return;
        }
        $db = Database::getInstance();
        try {
            $downloads = $db->incrementJsonCounter('subtitles', $id, 'downloads', 'lastDownloadedAt');
        } catch (\Throwable $e) {
            error_log('Atomic subtitle counter unavailable: ' . $e->getMessage());
            $downloads = null;
        }
        if ($downloads === null) {
            http_response_code(404);
            echo json_encode(['message' => 'Subtitle not found']);
            return;
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Download tracked', 'downloads' => $downloads]);
    }

    private static function sanitizeBaseTitle($rawTitle) {
        $title = trim((string)$rawTitle);
        // Strip pipe and anything after, e.g. "Title | Sinhala Subtitles" or "Title | සිංහල උපසිරැසි"
        if (strpos($title, '|') !== false) {
            $title = trim(explode('|', $title)[0]);
        }
        // Strip common redundant subtitle text
        $title = preg_replace('/\s*(sinhala\s*subtitles?|sinhala\s*subtitiles?|සිංහල\s*උපසිරැසි).*$/iu', '', $title);
        // Strip illegal filename characters: \ / : * ? " < > |
        $title = preg_replace('/[\\\\\/:*?"<>|]/', '', $title);
        // Collapse spaces
        $title = trim(preg_replace('/\s+/', ' ', $title));
        return $title;
    }

    public static function resolveDownloadFilename($subtitle, $db) {
        $ext = strtolower((string)($subtitle['format'] ?? 'srt'));
        if (empty($ext)) $ext = 'srt';

        $mediaType = strtolower((string)($subtitle['mediaType'] ?? ''));
        $mediaId = $subtitle['mediaId'] ?? null;
        $subLang = trim((string)($subtitle['language'] ?? 'Sinhala'));
        if (empty($subLang)) $subLang = 'Sinhala';

        if ($mediaType === 'episode') {
            $episode = $db->findOne('episodes', ['_id' => $mediaId]);
            $dramaTitle = '';
            $seasonNum = (int)($subtitle['seasonNumber'] ?? ($episode['seasonNumber'] ?? 1));
            $episodeNum = (int)($subtitle['episodeNumber'] ?? ($episode['episodeNumber'] ?? 1));
            if ($episode && !empty($episode['dramaId'])) {
                $drama = $db->findOne('dramas', ['_id' => $episode['dramaId']]);
                if ($drama) {
                    $dramaTitle = trim((string)($drama['title'] ?? ''));
                }
            }
            if (empty($dramaTitle)) {
                $dramaTitle = 'K-Drama';
            }
            $cleanTitle = self::sanitizeBaseTitle($dramaTitle);
            // For episode filenames, also strip trailing year (e.g. "Love on the Menu (2026)" -> "Love on the Menu")
            $cleanTitle = preg_replace('/\s*\(\d{4}\)$/', '', $cleanTitle);
            $cleanTitle = trim($cleanTitle) ?: 'K-Drama';
            $seasonFormatted = sprintf('S%02d', $seasonNum);
            $episodeFormatted = sprintf('E%02d', $episodeNum);
            return "{$cleanTitle} {$seasonFormatted}{$episodeFormatted} {$subLang} Subtitles - www.ksubzone.com.{$ext}";
        }

        if ($mediaType === 'movie') {
            $movie = $db->findOne('movies', ['_id' => $mediaId]);
            $movieTitle = trim((string)($movie['title'] ?? ''));
            $cleanTitle = self::sanitizeBaseTitle($movieTitle);
            if (empty($cleanTitle)) $cleanTitle = 'Movie';

            // Check if title already has a 4-digit year like (2024)
            $hasYear = preg_match('/\(\d{4}\)/', $cleanTitle);
            if (!$hasYear) {
                $year = '';
                if (!empty($movie['releaseDate'])) {
                    $year = substr($movie['releaseDate'], 0, 4);
                }
                if (empty($year) && !empty($movie['year'])) {
                    $year = (string)$movie['year'];
                }
                if (!empty($year)) {
                    return "{$cleanTitle} ({$year}) {$subLang} Subtitles - www.ksubzone.com.{$ext}";
                }
            }
            return "{$cleanTitle} {$subLang} Subtitles - www.ksubzone.com.{$ext}";
        }

        if ($mediaType === 'drama') {
            $drama = $db->findOne('dramas', ['_id' => $mediaId]);
            $dramaTitle = trim((string)($drama['title'] ?? ''));
            $cleanTitle = self::sanitizeBaseTitle($dramaTitle);
            if (empty($cleanTitle)) $cleanTitle = 'Drama';
            if (!empty($subtitle['seasonNumber']) && !empty($subtitle['episodeNumber'])) {
                $cleanTitle = preg_replace('/\s*\(\d{4}\)$/', '', $cleanTitle);
                $cleanTitle = trim($cleanTitle) ?: 'Drama';
                $seasonFormatted = sprintf('S%02d', (int)$subtitle['seasonNumber']);
                $episodeFormatted = sprintf('E%02d', (int)$subtitle['episodeNumber']);
                return "{$cleanTitle} {$seasonFormatted}{$episodeFormatted} {$subLang} Subtitles - www.ksubzone.com.{$ext}";
            }
            return "{$cleanTitle} {$subLang} Subtitles - www.ksubzone.com.{$ext}";
        }

        $id = (string)($subtitle['_id'] ?? 'file');
        return "subtitle-{$id}.{$ext}";
    }

    public static function injectSubtitleBranding($content, $format = 'srt') {
        if (empty($content)) return $content;
        $format = strtolower($format);

        // If already branded with www.ksubzone.com, do not duplicate
        if (stripos($content, 'www.ksubzone.com') !== false || stripos($content, 'ksubzone.com') !== false) {
            return $content;
        }

        if ($format === 'srt') {
            $normalized = str_replace(["\r\n", "\r"], "\n", $content);
            $normalized = trim($normalized);

            // Official KSubZone intro branding cue
            $introCue = "1\n00:00:02,000 --> 00:00:07,000\n<font color=\"#ffcc00\">නවතම කොරියානු චිත්‍රපට සහ රූපවාහිනි කතාමාලා සඳහා සිංහල උපසිරැසි</font>\n<font color=\"#ff9416\">ලබා ගැනීමට පිවිසෙන්න </font>www.ksubzone.com <font color=\"#ff9416\">අපගේ වෙබ් අඩවියට.</font>";

            $blocks = preg_split('/\n{2,}/', $normalized);
            if (empty($blocks)) {
                return $introCue . "\r\n\r\n" . $normalized;
            }

            $newBlocks = [$introCue];
            $cueIndex = 2;
            $lastEndTime = '00:00:07,000';

            foreach ($blocks as $block) {
                $lines = explode("\n", trim($block));
                if (empty($lines)) continue;

                // Remove original index number if present
                if (is_numeric(trim($lines[0]))) {
                    array_shift($lines);
                }

                // Look for timing line (00:00:00,000 --> 00:00:00,000)
                if (!empty($lines) && strpos($lines[0], '-->') !== false) {
                    $timeParts = explode('-->', $lines[0]);
                    if (count($timeParts) === 2) {
                        $lastEndTime = trim($timeParts[1]);
                    }
                }

                if (!empty($lines)) {
                    $newBlocks[] = $cueIndex . "\n" . implode("\n", $lines);
                    $cueIndex++;
                }
            }

            // Calculate outro time: 2 seconds after lastEndTime
            $outroStart = '01:30:00,000';
            $outroEnd = '01:30:05,000';
            if (preg_match('/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/', $lastEndTime, $m)) {
                $totalSecs = ((int)$m[1] * 3600) + ((int)$m[2] * 60) + (int)$m[3] + 2;
                $outStartSecs = $totalSecs;
                $outEndSecs = $totalSecs + 5;
                $outroStart = sprintf('%02d:%02d:%02d,000', floor($outStartSecs / 3600), floor(($outStartSecs % 3600) / 60), $outStartSecs % 60);
                $outroEnd = sprintf('%02d:%02d:%02d,000', floor($outEndSecs / 3600), floor(($outEndSecs % 3600) / 60), $outEndSecs % 60);
            }

            $outroCue = "{$cueIndex}\n{$outroStart} --> {$outroEnd}\n<font color=\"#ffcc00\">සිංහල උපසිරැසි ගැන්වීම KSubZone කණ්ඩායම</font>\n<font color=\"#ff9416\">www.ksubzone.com වෙතින් බාගත කරන ලදී.</font>";
            $newBlocks[] = $outroCue;

            return implode("\r\n\r\n", $newBlocks) . "\r\n";
        }

        if ($format === 'vtt') {
            $introCue = "00:00:02.000 --> 00:00:07.000\n<c.yellow>නවතම කොරියානු චිත්‍රපට සහ රූපවාහිනි කතාමාලා සඳහා සිංහල උපසිරැසි</c>\nලබා ගැනීමට පිවිසෙන්න www.ksubzone.com අපගේ වෙබ් අඩවියට.\n\n";
            if (stripos($content, 'WEBVTT') === 0) {
                return preg_replace('/^(WEBVTT[^\n]*\n+)/i', "$1" . $introCue, $content);
            }
            return "WEBVTT\n\n" . $introCue . $content;
        }

        return $content;
    }

    public static function downloadSubtitleFile($id) {
        $db = Database::getInstance();
        $subtitle = $db->findOne('subtitles', ['_id' => $id]);
        if (!$subtitle) {
            http_response_code(404);
            echo json_encode(['message' => 'Subtitle not found']);
            return;
        }

        $fileUrl = $subtitle['fileUrl'] ?? '';
        if (empty($fileUrl)) {
            http_response_code(404);
            echo json_encode(['message' => 'Subtitle file URL not found']);
            return;
        }

        // Track download metrics safely
        try {
            if (\Utils\VisitorGuard::shouldCount('sub_dl_' . $id)) {
                $db->incrementJsonCounter('subtitles', $id, 'downloads', 'lastDownloadedAt');
            }
        } catch (\Throwable $e) {
            error_log('Subtitle download count update failed: ' . $e->getMessage());
        }

        $ext = strtolower((string)($subtitle['format'] ?? 'srt'));
        if (empty($ext)) $ext = 'srt';

        // 1. Resolve authoritative filename from media record
        $resolvedFilename = self::resolveDownloadFilename($subtitle, $db);

        // If client provided a custom name query parameter, use it if valid
        $customName = trim((string)($_GET['name'] ?? ''));
        if (!empty($customName)) {
            $customName = preg_replace('/[^a-zA-Z0-9_\. -]/u', '_', $customName);
            if (pathinfo($customName, PATHINFO_EXTENSION) !== $ext) {
                $customName .= '.' . $ext;
            }
            $finalFilename = $customName;
        } elseif (!empty($resolvedFilename)) {
            $finalFilename = $resolvedFilename;
        } else {
            $finalFilename = 'subtitle-' . $id . '.' . $ext;
        }

        // 2. Fetch subtitle content (from R2 remote URL or local storage)
        $fileContent = '';
        if (preg_match('#^https?://#i', $fileUrl)) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $fileUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KSubZone/1.0');
            $fileContent = curl_exec($ch);
            $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($httpCode !== 200 || $fileContent === false || strlen($fileContent) === 0) {
                error_log('R2 subtitle fetch failed with HTTP ' . $httpCode . ': ' . ($curlError ?: $fileUrl));
                $fileContent = '';
            }
        }

        // Check local storage paths if not fetched remotely
        if (empty($fileContent)) {
            $baseFileName = basename(parse_url($fileUrl, PHP_URL_PATH) ?: $fileUrl);
            $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
            $legacyServerRoot = !empty($docRoot)
                ? dirname(rtrim($docRoot, '/\\')) . '/server-php'
                : dirname(dirname(__DIR__)) . '/server-php';

            $localDir = dirname(__DIR__) . '/uploads/subtitles';
            $possiblePaths = [
                $localDir . '/' . $baseFileName,
                dirname(__DIR__) . '/' . ltrim($fileUrl, '/'),
                dirname(__DIR__) . $fileUrl,
                dirname(dirname(__DIR__)) . '/' . ltrim($fileUrl, '/'),
                dirname(dirname(__DIR__)) . $fileUrl,
                $docRoot . '/uploads/subtitles/' . $baseFileName,
                $docRoot . '/' . ltrim($fileUrl, '/'),
                $docRoot . '/api/' . ltrim($fileUrl, '/'),
                $docRoot . '/api/uploads/subtitles/' . $baseFileName,
                $legacyServerRoot . '/uploads/subtitles/' . $baseFileName,
                dirname(dirname(__DIR__)) . '/uploads/subtitles/' . $baseFileName,
                dirname(dirname(__DIR__)) . '/server-php/uploads/subtitles/' . $baseFileName
            ];

            foreach ($possiblePaths as $testPath) {
                if (!empty($testPath) && file_exists($testPath) && !is_dir($testPath) && filesize($testPath) > 0) {
                    $content = @file_get_contents($testPath);
                    if ($content !== false && strlen($content) > 0) {
                        $fileContent = $content;
                        break;
                    }
                }
            }
        }

        if (empty($fileContent)) {
            http_response_code(503);
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode(['message' => 'මෙම උපසිරැසි ගොනුව දැන් බාගත කළ නොහැක. කරුණාකර සුළු මොහොතකින් නැවත උත්සාහ කරන්න.']);
            return;
        }

        // 3. Inject official KSubZone copyright / branding card into subtitle content
        $fileContent = self::injectSubtitleBranding($fileContent, $ext);

        // 4. Stream directly to browser with clean descriptive filename and proper UTF-8 headers
        while (ob_get_level()) {
            ob_end_clean();
        }

        header('Content-Description: File Transfer');
        $contentTypes = [
            'srt' => 'application/x-subrip; charset=UTF-8',
            'vtt' => 'text/vtt; charset=UTF-8',
            'ass' => 'text/plain; charset=UTF-8'
        ];
        header('Content-Type: ' . ($contentTypes[$ext] ?? 'application/octet-stream'));
        header('Content-Disposition: attachment; filename="' . $finalFilename . '"; filename*="UTF-8\'\'' . rawurlencode($finalFilename) . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate, post-check=0, pre-check=0, private');
        header('Pragma: public');
        header('Content-Length: ' . strlen($fileContent));

        echo $fileContent;
        exit;
    }

    public static function replaceSubtitleFile($id) {
        $db = Database::getInstance();
        $subtitle = $db->findOne('subtitles', ['_id' => $id]);
        if (!$subtitle) {
            http_response_code(404);
            echo json_encode(['message' => 'Subtitle not found']);
            return;
        }

        if (!isset($_FILES['subtitle'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Subtitle file is required']);
            return;
        }

        $file = $_FILES['subtitle'];
        if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['message' => 'Error uploading file. Code: ' . ($file['error'] ?? 'unknown')]);
            return;
        }

        $fileValidation = \Utils\Storage::validateSubtitleFile($file);
        if (!$fileValidation['valid']) {
            http_response_code(400);
            echo json_encode(['message' => $fileValidation['error']]);
            return;
        }

        // Resolve media context
        $mediaId = $subtitle['mediaId'] ?? '';
        $mediaType = $subtitle['mediaType'] ?? 'Drama';
        $mediaSlug = 'untitled';
        $mediaTitle = '';
        if (strtolower($mediaType) === 'episode') {
            $episode = $db->findOne('episodes', ['_id' => $mediaId]);
            if ($episode && !empty($episode['dramaId'])) {
                $drama = $db->findOne('dramas', ['_id' => $episode['dramaId']]);
                if ($drama) {
                    $mediaSlug = $drama['slug'] ?? \Utils\Slug::slugify($drama['title'] ?? '');
                    $mediaTitle = $drama['title'] ?? '';
                }
            }
        } elseif (strtolower($mediaType) === 'movie') {
            $movie = $db->findOne('movies', ['_id' => $mediaId]);
            if ($movie) {
                $mediaSlug = $movie['slug'] ?? \Utils\Slug::slugify($movie['title'] ?? '');
                $mediaTitle = $movie['title'] ?? '';
            }
        } else {
            $drama = $db->findOne('dramas', ['_id' => $mediaId]);
            if ($drama) {
                $mediaSlug = $drama['slug'] ?? \Utils\Slug::slugify($drama['title'] ?? '');
                $mediaTitle = $drama['title'] ?? '';
            }
        }

        $context = [
            'mediaSlug' => $mediaSlug,
            'mediaTitle' => $mediaTitle,
            'mediaType' => $mediaType,
            'seasonNumber' => $subtitle['seasonNumber'] ?? 1,
            'episodeNumber' => $subtitle['episodeNumber'] ?? 1,
            'language' => $subtitle['language'] ?? 'Sinhala',
            'version' => ($subtitle['version'] ?? '1.0') . '-replaced',
            'originalFilename' => $fileValidation['originalFilename']
        ];

        // Upload new file to R2 / Storage
        $uploadMeta = \Utils\Storage::uploadSubtitle($file, $context);
        if (!$uploadMeta || empty($uploadMeta['url'])) {
            http_response_code(500);
            echo json_encode(['message' => 'Failed to save new subtitle file to storage provider.']);
            return;
        }

        $updates = [
            'fileUrl' => $uploadMeta['url'],
            'format' => $fileValidation['ext'],
            'storageProvider' => $uploadMeta['provider'] ?? 'r2',
            'storageBucket' => $uploadMeta['bucket'] ?? null,
            'storageObjectKey' => $uploadMeta['objectKey'] ?? null,
            'originalFilename' => $uploadMeta['originalFilename'] ?? $fileValidation['originalFilename'],
            'storedFilename' => basename($uploadMeta['objectKey'] ?? $uploadMeta['url']),
            'fileSizeBytes' => $uploadMeta['sizeBytes'] ?? $fileValidation['size'],
            'fileChecksum' => $uploadMeta['checksum'] ?? null,
            'mimeType' => $uploadMeta['mimeType'] ?? $fileValidation['mime'],
            'updatedAt' => date('Y-m-d H:i:s')
        ];

        try {
            $db->updateOne('subtitles', ['_id' => $id], $updates);
        } catch (\Throwable $e) {
            error_log('Replace subtitle DB update failed, rolling back uploaded R2 object: ' . $e->getMessage());
            \Utils\Storage::rollbackUpload($uploadMeta['provider'], $uploadMeta['objectKey'] ?? '');
            http_response_code(500);
            echo json_encode(['message' => 'Database update failed. Storage upload was rolled back.']);
            return;
        }

        // Safety note: Do not delete existing Supabase file!
        // If old file was purely local, delete local disk copy:
        $oldUrl = $subtitle['fileUrl'] ?? '';
        if (strpos($oldUrl, '/uploads/') === 0) {
            \Utils\Storage::deleteFile($oldUrl);
        }

        $updated = $db->findOne('subtitles', ['_id' => $id]);
        self::triggerCacheRevalidation($subtitle['mediaId'], $subtitle['mediaType'], true);

        header('Content-Type: application/json');
        echo json_encode([
            'message' => 'Subtitle file replaced successfully',
            'subtitle' => $updated
        ]);
    }

    public static function rateSubtitle($id) {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $score = (int)($body['score'] ?? 0);

        if ($score < 1 || $score > 5) {
            http_response_code(400);
            echo json_encode(['message' => 'Score must be between 1 and 5']);
            return;
        }

        $db = Database::getInstance();
        $subtitle = $db->findOne('subtitles', ['_id' => $id]);
        if (!$subtitle) {
            http_response_code(404);
            echo json_encode(['message' => 'Subtitle not found']);
            return;
        }

        $user = AuthMiddleware::$currentUser;
        $ratings = $subtitle['ratings'] ?? [];
        $existingIndex = -1;
        foreach ($ratings as $idx => $r) {
            if ((string)$r['userId'] === (string)$user['_id']) {
                $existingIndex = $idx;
                break;
            }
        }

        if ($existingIndex > -1) {
            $ratings[$existingIndex]['score'] = $score;
        } else {
            $ratings[] = ['userId' => $user['_id'], 'score' => $score];
        }

        // Recalculate average rating
        $sum = 0;
        foreach ($ratings as $r) {
            $sum += $r['score'];
        }
        $avg = count($ratings) > 0 ? round($sum / count($ratings), 1) : 0;

        $db->updateOne('subtitles', ['_id' => $id], [
            'ratings' => $ratings,
            'rating' => $avg
        ]);

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Subtitle rated successfully', 'rating' => $avg]);
    }

    public static function getModerationQueue() {
        $db = Database::getInstance();
        $mediaId = $_GET['mediaId'] ?? null;
        $query = [];
        if (!empty($mediaId)) {
            $query['mediaId'] = $mediaId;
        }
        $subtitles = $db->find('subtitles', $query, ['sort' => ['createdAt' => -1]]);

        // Populate uploader, admin uploader and target media details
        $movies = $db->find('movies');
        $dramas = $db->find('dramas');
        $episodes = $db->find('episodes');
        $movieMap = []; foreach ($movies as $m) $movieMap[(string)$m['_id']] = $m;
        $dramaMap = []; foreach ($dramas as $d) $dramaMap[(string)$d['_id']] = $d;
        $episodeMap = []; foreach ($episodes as $e) $episodeMap[(string)$e['_id']] = $e;

        // Resolve uploader references in batches. The moderation queue can
        // contain hundreds of rows; one database query per row caused the
        // admin page to hit PHP's 30-second execution limit.
        $uploaderIds = [];
        $adminUploaderIds = [];
        foreach ($subtitles as $subtitle) {
            if (!empty($subtitle['uploader'])) $uploaderIds[] = $subtitle['uploader'];
            if (!empty($subtitle['adminUploader'])) $adminUploaderIds[] = $subtitle['adminUploader'];
        }
        $uploaderMap = [];
        if (!empty($uploaderIds)) {
            foreach ($db->find('users', ['_id' => ['$in' => array_values(array_unique($uploaderIds))]]) as $uploader) {
                $uploaderMap[(string)$uploader['_id']] = $uploader;
            }
        }
        $adminUploaderMap = [];
        if (!empty($adminUploaderIds)) {
            foreach ($db->find('admins', ['_id' => ['$in' => array_values(array_unique($adminUploaderIds))]]) as $adminUploader) {
                $adminUploaderMap[(string)$adminUploader['_id']] = $adminUploader;
            }
        }

        foreach ($subtitles as &$sub) {
            $uploaderId = $sub['uploader'] ?? null;
            $uploader = $uploaderId ? ($uploaderMap[(string)$uploaderId] ?? null) : null;
            $sub['uploader'] = $uploader ? [
                '_id' => $uploader['_id'],
                'username' => $uploader['username'],
                'email' => $uploader['email'] ?? ''
            ] : null;

            $adminUploaderId = $sub['adminUploader'] ?? null;
            $adminUploader = $adminUploaderId ? ($adminUploaderMap[(string)$adminUploaderId] ?? null) : null;
            $sub['adminUploader'] = $adminUploader ? [
                '_id' => $adminUploader['_id'],
                'username' => $adminUploader['username'] ?? $adminUploader['name'] ?? 'Admin',
            ] : null;

            $mId = (string)($sub['mediaId'] ?? '');
            $mType = strtolower($sub['mediaType'] ?? '');
            if ($mType === 'movie' && isset($movieMap[$mId])) {
                $sub['mediaTitle'] = $movieMap[$mId]['title'] ?? '';
                $sub['mediaSlug'] = $movieMap[$mId]['slug'] ?? '';
                $sub['mediaPoster'] = $movieMap[$mId]['poster'] ?? '';
            } elseif ($mType === 'episode' && isset($episodeMap[$mId])) {
                $ep = $episodeMap[$mId];
                $dr = $dramaMap[(string)($ep['dramaId'] ?? '')] ?? null;
                $sub['mediaTitle'] = ($dr['title'] ?? 'Drama') . ' - Season ' . ($ep['seasonNumber'] ?? 1) . ' Ep ' . ($ep['episodeNumber'] ?? 1);
                $sub['mediaSlug'] = $dr['slug'] ?? '';
                $sub['mediaPoster'] = $dr['poster'] ?? '';
            } elseif (isset($dramaMap[$mId])) {
                $sub['mediaTitle'] = $dramaMap[$mId]['title'] ?? '';
                $sub['mediaSlug'] = $dramaMap[$mId]['slug'] ?? '';
                $sub['mediaPoster'] = $dramaMap[$mId]['poster'] ?? '';
            } else {
                $sub['mediaTitle'] = ucfirst($sub['mediaType'] ?? 'Media') . ' (' . $mId . ')';
            }
        }

        header('Content-Type: application/json');
        echo json_encode(array_values($subtitles));
    }

    public static function updateApprovalStatus($id) {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $status = $body['status'] ?? '';
        $moderatorNotes = $body['moderatorNotes'] ?? '';

        if (!in_array($status, ['Approved', 'Rejected'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Status must be Approved or Rejected']);
            return;
        }

        $db = Database::getInstance();
        $subtitle = $db->findOne('subtitles', ['_id' => $id]);
        if (!$subtitle) {
            http_response_code(404);
            echo json_encode(['message' => 'Subtitle not found']);
            return;
        }

        $wasPublic = ($subtitle['approvalStatus'] ?? '') === 'Approved';

        $db->updateOne('subtitles', ['_id' => $id], [
            'approvalStatus' => $status,
            'moderatorNotes' => $moderatorNotes
        ]);

        // Notify uploader
        $db->insertOne('notifications', [
            'recipient' => $subtitle['uploader'] ?? null,
            'title' => "Subtitle Upload {$status}",
            'message' => "Your subtitle upload for {$subtitle['language']} was " . strtolower($status) . "." . ($moderatorNotes ? ' Notes: ' . $moderatorNotes : ''),
            'type' => $status === 'Approved' ? 'subtitle_approved' : 'subtitle_rejected',
            'isRead' => false
        ]);

        $subtitle['approvalStatus'] = $status;
        $subtitle['moderatorNotes'] = $moderatorNotes;

        // Both publishing and unpublishing change the public episode state.
        if ($status === 'Approved' || $wasPublic) {
            self::triggerCacheRevalidation($subtitle['mediaId'], $subtitle['mediaType'], true);
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => "Subtitle " . strtolower($status) . " successfully", 'subtitle' => $subtitle]);
    }

    public static function getUploaderHistory($userId) {
        $db = Database::getInstance();
        $uploads = $db->find('subtitles', ['uploader' => $userId], ['sort' => ['createdAt' => -1]]);

        $totalDownloads = 0;
        foreach ($uploads as $up) {
            $totalDownloads += $up['downloads'] ?? 0;
        }

        header('Content-Type: application/json');
        echo json_encode([
            'uploads' => $uploads,
            'totalUploads' => count($uploads),
            'totalDownloads' => $totalDownloads
        ]);
    }

    public static function editSubtitle($id) {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $db = Database::getInstance();
        $subtitle = $db->findOne('subtitles', ['_id' => $id]);
        if (!$subtitle) {
            http_response_code(404);
            echo json_encode(['message' => 'Subtitle not found']);
            return;
        }

        $updates = [];
        if (isset($body['language'])) $updates['language'] = $body['language'];
        if (isset($body['version'])) $updates['version'] = $body['version'];
        if (isset($body['seasonNumber'])) $updates['seasonNumber'] = $body['seasonNumber'] === '' ? null : (int)$body['seasonNumber'];
        if (isset($body['episodeNumber'])) $updates['episodeNumber'] = $body['episodeNumber'] === '' ? null : (int)$body['episodeNumber'];
        if (isset($body['seasonStatus'])) $updates['seasonStatus'] = $body['seasonStatus'];
        if (isset($body['approvalStatus'])) $updates['approvalStatus'] = $body['approvalStatus'];
        if (isset($body['releaseNotes'])) $updates['releaseNotes'] = $body['releaseNotes'];
        if (isset($body['moderatorNotes'])) $updates['moderatorNotes'] = $body['moderatorNotes'];

        $wasPublic = ($subtitle['approvalStatus'] ?? '') === 'Approved';
        if (!empty($updates)) {
            $db->updateOne('subtitles', ['_id' => $id], $updates);
            $subtitle = $db->findOne('subtitles', ['_id' => $id]);

            // An admin subtitle edit is public content activity. User views
            // and other generic writes must not affect this clock.
            $isPublicSubtitle = $wasPublic || ($subtitle['approvalStatus'] ?? '') === 'Approved';
            if ($isPublicSubtitle) {
                self::triggerCacheRevalidation(
                    $subtitle['mediaId'],
                    $subtitle['mediaType'],
                    true
                );
            }
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Subtitle updated successfully', 'subtitle' => $subtitle]);
    }

    public static function deleteSubtitle($id) {
        $db = Database::getInstance();
        $subtitle = $db->findOne('subtitles', ['_id' => $id]);
        if (!$subtitle) {
            http_response_code(404);
            echo json_encode(['message' => 'Subtitle not found']);
            return;
        }

        if (!empty($subtitle['fileUrl'])) {
            \Utils\Storage::deleteFile($subtitle['fileUrl']);
        }

        $db->deleteOne('subtitles', ['_id' => $id]);

        // Invalidate before acknowledging the delete so a public refetch can
        // never race against the old cached subtitle list.
        if (($subtitle['approvalStatus'] ?? '') === 'Approved') {
            self::triggerCacheRevalidation($subtitle['mediaId'], $subtitle['mediaType'], true);
        } else {
            \Utils\Cache::deleteByPrefix('media_subtitles_v2_');
            \Utils\Cache::deleteByPrefix('recent_subtitles_v2_');
            \Utils\Cache::delete('admin_dashboard_v3');
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Subtitle deleted successfully']);
    }

    /**
     * Safely trigger cache flush and Next.js revalidation without crashing subtitle operations.
     */
    private static function triggerCacheRevalidation($mediaId, $mediaType, $recordActivity = true) {
        try {
            self::revalidateMediaForSubtitle($mediaId, $mediaType, $recordActivity);
            $catalogType = strtolower((string)$mediaType) === 'movie' ? 'movie' : 'drama';
            \Utils\Revalidate::catalog($catalogType);
        } catch (\Throwable $e) {
            error_log("Subtitle cache revalidation notice (non-fatal): " . $e->getMessage());
        }
    }

    /**
     * Helper to lookup media details and revalidate corresponding detail page.
     */
    private static function revalidateMediaForSubtitle($mediaId, $mediaType, $recordActivity = false) {
        try {
            $db = Database::getInstance();
            $mediaTypeClean = strtolower($mediaType);
            $contentUpdatedAt = gmdate(DATE_ATOM);
            $updatedAt = gmdate('Y-m-d H:i:s');
            
            // Batch subtitle endpoints use a comma-separated list as their
            // cache key, so deleting only the single media ID is insufficient.
            \Utils\Cache::deleteByPrefix('media_subtitles_v2_');
            \Utils\Cache::deleteByPrefix('recent_subtitles_v2_');
            if ($mediaTypeClean === 'episode') {
                $episode = $db->findOne('episodes', ['_id' => $mediaId]);
                if ($episode) {
                    $dramaId = (string)($episode['dramaId'] ?? '');
                    if ($dramaId !== '') {
                        \Utils\Cache::delete("drama_detail_" . $dramaId);
                    }
                    if ($recordActivity) {
                        $db->updateOne('dramas', ['_id' => $episode['dramaId']], [
                            'updatedAt' => $updatedAt,
                            'contentUpdatedAt' => $contentUpdatedAt
                        ]);
                    }
                    
                    $drama = $db->findOne('dramas', ['_id' => $episode['dramaId']]);
                    if ($drama && !empty($drama['slug'])) {
                        \Utils\Cache::delete('drama_detail_slug_v1_' . md5(strtolower((string)$drama['slug'])));
                        \Utils\Revalidate::media('drama', $drama['slug']);
                    }
                }
            } elseif ($mediaTypeClean === 'movie') {
                $movie = $db->findOne('movies', ['_id' => $mediaId]);
                if ($movie) {
                    \Utils\Cache::delete("movie_detail_" . (string)$movie['_id']);
                    if ($recordActivity) {
                        $db->updateOne('movies', ['_id' => $mediaId], [
                            'updatedAt' => $updatedAt,
                            'contentUpdatedAt' => $contentUpdatedAt
                        ]);
                    }
                    if (!empty($movie['slug'])) {
                        \Utils\Cache::delete('movie_detail_slug_v1_' . md5(strtolower((string)$movie['slug'])));
                        \Utils\Revalidate::media('movie', $movie['slug']);
                    }
                }
            } else { // 'drama' or fallback
                $targetDramaId = $mediaId;
                $drama = $db->findOne('dramas', ['_id' => $mediaId]);
                if (!$drama) {
                    $episode = $db->findOne('episodes', ['_id' => $mediaId]);
                    if ($episode && !empty($episode['dramaId'])) {
                        $targetDramaId = $episode['dramaId'];
                        $drama = $db->findOne('dramas', ['_id' => $targetDramaId]);
                    }
                }
                \Utils\Cache::delete("drama_detail_" . (string)$targetDramaId);
                if ($recordActivity) {
                    $db->updateOne('dramas', ['_id' => $targetDramaId], [
                        'updatedAt' => $updatedAt,
                        'contentUpdatedAt' => $contentUpdatedAt
                    ]);
                }
                
                if ($drama && !empty($drama['slug'])) {
                    \Utils\Cache::delete('drama_detail_slug_v1_' . md5(strtolower((string)$drama['slug'])));
                    \Utils\Revalidate::media('drama', $drama['slug']);
                }
            }
        } catch (\Exception $e) {
            error_log("Failed to revalidate media for subtitle: " . $e->getMessage());
        }
    }
}
