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

        // Invalidate cache and trigger revalidation if immediately approved
        if ($approvalStatus === 'Approved') {
            \Utils\Cache::flush();
            \Utils\Revalidate::catalog('all');
            self::revalidateMediaForSubtitle($mediaId, $mediaType, true);
        }

        http_response_code(201);
        echo json_encode([
            'message' => $uploaderRole === 'Admin'
                ? 'Admin subtitle uploaded and published successfully.'
                : 'Subtitle uploaded successfully. Pending moderator approval.',
            'subtitle' => [
                '_id' => $inserted['_id'] ?? null,
                'fileUrl' => $fileUrl,
                'storageProvider' => $subtitle['storageProvider'],
                'storageObjectKey' => $subtitle['storageObjectKey']
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

        // R2 is a public immutable object store. Redirect instead of proxying
        // the file through PHP/Vercel, which avoids duplicate egress and
        // function transfer. The client can opt into a server-side proxy when
        // a browser-side Cloudflare request is rejected with HTTP 403.
        if (($subtitle['storageProvider'] ?? '') === 'r2' && preg_match('#^https?://#i', $fileUrl)) {
            $proxyRequested = isset($_SERVER['HTTP_X_SUBTITLE_PROXY'])
                && (string)$_SERVER['HTTP_X_SUBTITLE_PROXY'] === '1';

            if ($proxyRequested) {
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $fileUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
                curl_setopt($ch, CURLOPT_TIMEOUT, 30);
                curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
                $fileContent = curl_exec($ch);
                $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlError = curl_error($ch);
                curl_close($ch);

                if ($httpCode !== 200 || $fileContent === false || strlen($fileContent) === 0) {
                    error_log('R2 subtitle proxy failed with HTTP ' . $httpCode . ': ' . ($curlError ?: $fileUrl));
                    http_response_code(503);
                    header('Content-Type: application/json; charset=UTF-8');
                    echo json_encode(['message' => 'මෙම උපසිරැසි ගොනුව දැන් බාගත කළ නොහැක. කරුණාකර සුළු මොහොතකින් නැවත උත්සාහ කරන්න.']);
                    return;
                }

                try {
                    if (\Utils\VisitorGuard::shouldCount('sub_dl_' . $id)) {
                        $db->incrementJsonCounter('subtitles', $id, 'downloads', 'lastDownloadedAt');
                    }
                } catch (\Throwable $e) {
                    error_log('Subtitle download count update failed: ' . $e->getMessage());
                }

                $customName = $_GET['name'] ?? '';
                $ext = strtolower((string)($subtitle['format'] ?? 'srt'));
                if (empty($customName)) {
                    $customName = 'subtitle-' . $id . '.' . $ext;
                } else {
                    $customName = preg_replace('/[^a-zA-Z0-9_\.-]/', '_', $customName);
                    if (pathinfo($customName, PATHINFO_EXTENSION) !== $ext) {
                        $customName .= '.' . $ext;
                    }
                }

                $contentTypes = [
                    'srt' => 'application/x-subrip; charset=UTF-8',
                    'vtt' => 'text/vtt; charset=UTF-8',
                    'ass' => 'text/plain; charset=UTF-8'
                ];
                header('Content-Type: ' . ($contentTypes[$ext] ?? 'application/octet-stream'));
                header('Content-Disposition: attachment; filename="' . $customName . '"');
                header('Content-Length: ' . strlen($fileContent));
                header('Cache-Control: private, no-store');
                echo $fileContent;
                exit;
            }

            try {
                if (\Utils\VisitorGuard::shouldCount('sub_dl_' . $id)) {
                    $db->incrementJsonCounter('subtitles', $id, 'downloads', 'lastDownloadedAt');
                }
            } catch (\Throwable $e) {
                // Ignore analytics write errors
            }
            header('Cache-Control: public, max-age=31536000, immutable');
            header('Content-Disposition: attachment; filename="' . preg_replace('/[^a-zA-Z0-9._-]/', '_', 'subtitle-' . $id . '.' . ($subtitle['format'] ?? 'srt')) . '"');
            header('Location: ' . $fileUrl, true, 302);
            exit;
        }

        // Determine filename
        $customName = $_GET['name'] ?? '';
        $ext = $subtitle['format'] ?? 'srt';
        if (empty($customName)) {
            $customName = 'subtitle-' . $id . '.' . $ext;
        } else {
            // Clean filename to prevent path traversal or invalid characters
            $customName = preg_replace('/[^a-zA-Z0-9_\.-]/', '_', $customName);
            if (pathinfo($customName, PATHINFO_EXTENSION) !== $ext) {
                $customName .= '.' . $ext;
            }
        }

        // Clean and prepare local caching directory
        $baseFileName = basename(parse_url($fileUrl, PHP_URL_PATH) ?: $fileUrl);
        $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
        $legacyServerRoot = !empty($docRoot)
            ? dirname(rtrim($docRoot, '/\\')) . '/server-php'
            : dirname(dirname(__DIR__)) . '/server-php';

        $localDir = dirname(__DIR__) . '/uploads/subtitles';
        if (!file_exists($localDir)) {
            @mkdir($localDir, 0777, true);
        }

        // 1. Check local storage paths first (cPanel disk)
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

        $fileContent = '';
        foreach ($possiblePaths as $testPath) {
            if (!empty($testPath) && file_exists($testPath) && !is_dir($testPath) && filesize($testPath) > 0) {
                $content = @file_get_contents($testPath);
                if ($content !== false && strlen($content) > 0) {
                    $fileContent = $content;
                    break;
                }
            }
        }

        // 2. If not cached locally and URL is remote, fetch and cache on cPanel.
        // Existing records can still point at an older Supabase project. Try
        // the record URL first, then the currently configured project. This
        // lets a migrated bucket recover downloads without rewriting every
        // subtitle row by hand.
        if (empty($fileContent) && (strpos($fileUrl, 'http://') === 0 || strpos($fileUrl, 'https://') === 0)) {
            $supabaseKey = $_ENV['SUPABASE_KEY'] ?? getenv('SUPABASE_KEY') ?: '';
            $remoteCandidates = [$fileUrl];
            $configuredOrigin = rtrim($_ENV['SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?: '', '/');
            $configuredBucket = $_ENV['SUPABASE_BUCKET'] ?? getenv('SUPABASE_BUCKET') ?: 'Ksubzone';

            // A legacy public URL may return 402 after the old project hits
            // its egress cap. Keep the same object path on the active project
            // as a fallback when the storage migration has copied the file.
            $parsedPath = parse_url($fileUrl, PHP_URL_PATH) ?: '';
            if ($configuredOrigin !== '' && strpos($parsedPath, '/storage/v1/object/') !== false) {
                $objectMarker = '/storage/v1/object/';
                $markerPosition = strpos($parsedPath, $objectMarker);
                $objectPath = substr($parsedPath, $markerPosition + strlen($objectMarker));
                $objectPath = preg_replace('#^public/#', '', $objectPath);
                $segments = explode('/', trim($objectPath, '/'));
                if (count($segments) >= 2) {
                    array_shift($segments); // discard the old bucket name
                    $remoteCandidates[] = $configuredOrigin . '/storage/v1/object/public/'
                        . rawurlencode($configuredBucket) . '/' . implode('/', array_map('rawurlencode', $segments));
                }
            }

            $lastRemoteStatus = 0;
            foreach (array_unique($remoteCandidates) as $candidateUrl) {
                $headers = [];
                if (!empty($supabaseKey) && strpos($candidateUrl, 'supabase.co') !== false) {
                    $headers[] = "Authorization: Bearer {$supabaseKey}";
                    $headers[] = "apikey: {$supabaseKey}";
                }

                for ($attempt = 1; $attempt <= 3; $attempt++) {
                    $ch = curl_init();
                    curl_setopt($ch, CURLOPT_URL, $candidateUrl);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
                    curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
                    if (!empty($headers)) curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

                    $fetched = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    $curlError = curl_error($ch);
                    curl_close($ch);
                    $lastRemoteStatus = $httpCode;

                    if ($httpCode === 200 && $fetched !== false && strlen($fetched) > 0) {
                        $fileContent = $fetched;
                        @file_put_contents($localDir . '/' . $baseFileName, $fileContent);
                        break 2;
                    }

                    error_log("Subtitle remote download attempt {$attempt} failed with HTTP {$httpCode}: " . ($curlError ?: $candidateUrl));
                    if (in_array($httpCode, [400, 401, 403, 404], true)) break;
                    if ($attempt < 3) usleep(250000 * $attempt);
                }
            }

            if (empty($fileContent) && $lastRemoteStatus === 402) {
                http_response_code(402);
                header('Content-Type: application/json; charset=UTF-8');
                echo json_encode([
                    'code' => 'SUBTITLE_STORAGE_RESTRICTED',
                    'message' => 'Subtitle backup storage is restricted. Please contact the site administrator to restore the file or storage service.'
                ]);
                return;
            }
        }

        // 3. If file content could not be found or resolved
        if (empty($fileContent)) {
            http_response_code(503);
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode(['message' => 'මෙම උපසිරැසි ගොනුව දැන් බාගත කළ නොහැක. කරුණාකර සුළු මොහොතකින් නැවත උත්සාහ කරන්න.']);
            return;
        }

        // Count only downloads for which the file was actually resolved. A
        // missing local/remote file must not inflate the public counter.
        try {
            if (\Utils\VisitorGuard::shouldCount('sub_dl_' . $id)) {
                $db->incrementJsonCounter('subtitles', $id, 'downloads', 'lastDownloadedAt');
            }
        } catch (\Throwable $e) {
            // A transient analytics write failure must never block the file.
            error_log('Subtitle download count update failed: ' . $e->getMessage());
        }

        // Clean headers to make sure no other output is sent
        if (ob_get_level()) {
            ob_end_clean();
        }

        // Send headers for file download
        header('Content-Description: File Transfer');
        $contentTypes = [
            'srt' => 'application/x-subrip; charset=UTF-8',
            'vtt' => 'text/vtt; charset=UTF-8',
            'ass' => 'text/plain; charset=UTF-8'
        ];
        header('Content-Type: ' . ($contentTypes[strtolower($ext)] ?? 'application/octet-stream'));
        header('Content-Disposition: attachment; filename="' . $customName . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
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

        \Utils\Cache::flush();
        \Utils\Revalidate::catalog('all');
        self::revalidateMediaForSubtitle($subtitle['mediaId'], $subtitle['mediaType'], true);

        $updated = $db->findOne('subtitles', ['_id' => $id]);
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

        foreach ($subtitles as &$sub) {
            $uploaderId = $sub['uploader'] ?? null;
            $uploader = $uploaderId ? $db->findOne('users', ['_id' => $uploaderId]) : null;
            $sub['uploader'] = $uploader ? [
                '_id' => $uploader['_id'],
                'username' => $uploader['username'],
                'email' => $uploader['email'] ?? ''
            ] : null;

            $adminUploaderId = $sub['adminUploader'] ?? null;
            $adminUploader = $adminUploaderId ? $db->findOne('admins', ['_id' => $adminUploaderId]) : null;
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

        $db->updateOne('subtitles', ['_id' => $id], [
            'approvalStatus' => $status,
            'moderatorNotes' => $moderatorNotes
        ]);

        // Invalidate cache and trigger revalidation
        if ($status === 'Approved') {
            \Utils\Cache::flush();
            \Utils\Revalidate::catalog('all');
            self::revalidateMediaForSubtitle($subtitle['mediaId'], $subtitle['mediaType'], true);
        }

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

        if (!empty($updates)) {
            $db->updateOne('subtitles', ['_id' => $id], $updates);
            $subtitle = $db->findOne('subtitles', ['_id' => $id]);

            // Invalidate cache and trigger revalidation
            \Utils\Cache::flush();
            \Utils\Revalidate::catalog('all');
            // An admin subtitle edit is public content activity. User views
            // and other generic writes must not affect this clock.
            $isPublicSubtitle = ($subtitle['approvalStatus'] ?? '') === 'Approved'
                || (($updates['approvalStatus'] ?? '') === 'Approved');
            self::revalidateMediaForSubtitle(
                $subtitle['mediaId'],
                $subtitle['mediaType'],
                $isPublicSubtitle
            );
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

        // Invalidate cache and trigger revalidation
        \Utils\Cache::flush();
        \Utils\Revalidate::catalog('all');
        if ($subtitle && ($subtitle['approvalStatus'] ?? '') === 'Approved') {
            self::revalidateMediaForSubtitle($subtitle['mediaId'], $subtitle['mediaType'], true);
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Subtitle deleted successfully']);
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
            
            \Utils\Cache::flush();
            \Utils\Cache::delete("media_subtitles_v2_" . md5((string)$mediaId));
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
                    \Utils\Revalidate::media('drama', $drama['slug']);
                }
            }
        } catch (\Exception $e) {
            error_log("Failed to revalidate media for subtitle: " . $e->getMessage());
        }
    }
}
