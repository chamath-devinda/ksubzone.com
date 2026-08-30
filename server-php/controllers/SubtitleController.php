<?php
namespace Controllers;

use Config\Database;
use Middleware\AuthMiddleware;

class SubtitleController {
    public static function uploadSubtitle() {
        $mediaId = $_POST['mediaId'] ?? '';
        $mediaType = $_POST['mediaType'] ?? '';
        $language = $_POST['language'] ?? '';
        $version = $_POST['version'] ?? '1.0';
        $releaseNotes = $_POST['releaseNotes'] ?? '';
        $seasonNumber = isset($_POST['seasonNumber']) ? (int)$_POST['seasonNumber'] : null;
        $episodeNumber = isset($_POST['episodeNumber']) ? (int)$_POST['episodeNumber'] : null;
        $seasonStatus = ($_POST['seasonStatus'] ?? 'Ongoing') === 'Complete' ? 'Complete' : 'Ongoing';

        if (!isset($_FILES['subtitle'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Subtitle file is required']);
            return;
        }

        $file = $_FILES['subtitle'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['message' => 'Error uploading file']);
            return;
        }

        if (empty($mediaId) || empty($mediaType) || empty($language)) {
            http_response_code(400);
            echo json_encode(['message' => 'Media ID, Media Type (Movie/Drama/Episode), and Language are required']);
            return;
        }

        if (!in_array($language, ['Sinhala', 'English'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Only Sinhala and English subtitles are supported']);
            return;
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['srt', 'vtt', 'ass'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid subtitle format. Supported formats: SRT, VTT, ASS']);
            return;
        }

        // Save file
        $fileUrl = \Utils\Storage::uploadFile($file, 'subtitles');
        if (!$fileUrl) {
            http_response_code(500);
            // Return detailed diagnostic to help identify the failure
            $diagTargetDir = dirname(__DIR__) . '/uploads/subtitles';
            $diagInfo = [
                'php_upload_enabled' => (bool)ini_get('file_uploads'),
                'upload_max_filesize' => ini_get('upload_max_filesize'),
                'post_max_size' => ini_get('post_max_size'),
                'uploads_dir_exists' => file_exists($diagTargetDir),
                'uploads_dir_writable' => is_writable($diagTargetDir),
                'uploads_parent_writable' => is_writable(dirname($diagTargetDir)),
                'tmp_file_exists' => file_exists($file['tmp_name']),
                'file_size' => $file['size'],
                'file_error' => $file['error'],
                'supabase_configured' => !empty($_ENV['SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?: '')
            ];
            echo json_encode(['message' => 'Failed to save subtitle file. Please check server storage configuration.', 'diagnostics' => $diagInfo]);
            return;
        }

        $db = Database::getInstance();
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
            'releaseNotes' => $releaseNotes
        ];

        $inserted = $db->insertOne('subtitles', $subtitle);

        if ($uploaderRole === 'User') {
            // Add notification for admins
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
            \Utils\Revalidate::path('/');
            self::revalidateMediaForSubtitle($mediaId, $mediaType, true);
        }

        http_response_code(201);
        echo json_encode([
            'message' => $uploaderRole === 'Admin'
                ? 'Admin subtitle uploaded and published successfully.'
                : 'Subtitle uploaded successfully. Pending moderator approval.',
            'subtitle' => $inserted
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
        $db = Database::getInstance();
        $subtitle = $db->findOne('subtitles', ['_id' => $id]);
        if (!$subtitle) {
            http_response_code(404);
            echo json_encode(['message' => 'Subtitle not found']);
            return;
        }

        $downloads = ($subtitle['downloads'] ?? 0) + 1;
        $db->updateOne('subtitles', ['_id' => $id], [
            'downloads' => $downloads,
            'lastDownloadedAt' => date('Y-m-d H:i:s')
        ]);

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

        // Public Supabase objects are already served from a storage CDN. Do
        // not download the file into PHP and upload the same bytes again.
        // Older frontend clients receive a fast redirect; the current client
        // downloads from this URL directly and tracks via the POST endpoint.
        $remoteScheme = strtolower((string)parse_url($fileUrl, PHP_URL_SCHEME));
        $remoteHost = strtolower((string)parse_url($fileUrl, PHP_URL_HOST));
        $isSupabaseObject = $remoteScheme === 'https'
            && $remoteHost !== ''
            && substr($remoteHost, -12) === '.supabase.co';

        if ($isSupabaseObject) {
            header('Cache-Control: no-store');
            header('Location: ' . $fileUrl, true, 302);

            // Flush the redirect before the non-critical analytics update on
            // FastCGI hosts, so the download is never held behind a DB write.
            if (function_exists('fastcgi_finish_request')) {
                fastcgi_finish_request();
            }

            try {
                $db->updateOne('subtitles', ['_id' => $id], [
                    'downloads' => ($subtitle['downloads'] ?? 0) + 1,
                    'lastDownloadedAt' => date('Y-m-d H:i:s')
                ]);
            } catch (\Exception $e) {
                error_log('Subtitle redirect count update failed: ' . $e->getMessage());
            }
            exit;
        }

        // Retrieve file content
        $fileContent = '';
        if (strpos($fileUrl, 'http://') === 0 || strpos($fileUrl, 'https://') === 0) {
            // Fetch remote file (e.g. from Supabase)
            $httpCode = 0;
            for ($attempt = 1; $attempt <= 3; $attempt++) {
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $fileUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
                curl_setopt($ch, CURLOPT_TIMEOUT, 25);
                curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
                $fileContent = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlError = curl_error($ch);
                curl_close($ch);

                if ($httpCode === 200 && $fileContent !== false && strlen($fileContent) > 0) {
                    break;
                }

                error_log(
                    "Subtitle remote download attempt {$attempt} failed with HTTP {$httpCode}: " .
                    ($curlError ?: $fileUrl)
                );
                $fileContent = false;
                if ($attempt < 3) {
                    usleep(250000 * $attempt);
                }
            }

            if ($httpCode !== 200 || $fileContent === false || strlen($fileContent) === 0) {
                // If remote fetch failed, redirect to the URL as fallback
                header("Location: " . $fileUrl);
                exit;
            }
        } else {
            // Local file - test multiple potential paths
            $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
            $legacyServerRoot = !empty($docRoot)
                ? dirname(rtrim($docRoot, '/\\')) . '/server-php'
                : dirname(dirname(__DIR__)) . '/server-php';
            $possiblePaths = [
                dirname(__DIR__) . '/' . ltrim($fileUrl, '/'),
                dirname(__DIR__) . $fileUrl,
                dirname(dirname(__DIR__)) . '/' . ltrim($fileUrl, '/'),
                dirname(dirname(__DIR__)) . $fileUrl,
                $docRoot . '/' . ltrim($fileUrl, '/'),
                $docRoot . '/api/' . ltrim($fileUrl, '/'),
                dirname(__DIR__) . '/uploads/subtitles/' . basename($fileUrl),
                dirname(dirname(__DIR__)) . '/uploads/subtitles/' . basename($fileUrl),
                $docRoot . '/uploads/subtitles/' . basename($fileUrl),
                $docRoot . '/api/uploads/subtitles/' . basename($fileUrl),
                // Older deployments stored uploads beside the new `api`
                // document root at public_html/server-php/uploads.
                $legacyServerRoot . '/uploads/subtitles/' . basename($fileUrl),
                dirname(dirname(__DIR__)) . '/server-php/uploads/subtitles/' . basename($fileUrl)
            ];

            $foundPath = null;
            foreach ($possiblePaths as $testPath) {
                if (!empty($testPath) && file_exists($testPath) && !is_dir($testPath)) {
                    $foundPath = $testPath;
                    break;
                }
            }

            if ($foundPath) {
                $fileContent = @file_get_contents($foundPath);
                if ($fileContent === false) {
                    http_response_code(500);
                    echo json_encode(['message' => 'Failed to read subtitle file']);
                    return;
                }
            } else {
                // Fallback: Check Supabase storage if configured
                $supabaseUrl = $_ENV['SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?: '';
                $supabaseKey = $_ENV['SUPABASE_KEY'] ?? getenv('SUPABASE_KEY') ?: '';
                $supabaseBucket = $_ENV['SUPABASE_BUCKET'] ?? getenv('SUPABASE_BUCKET') ?: 'Ksubzone';
                $baseFileName = basename($fileUrl);

                if (!empty($supabaseUrl) && !empty($baseFileName)) {
                    $supabasePublicUrl = rtrim($supabaseUrl, '/') . "/storage/v1/object/public/{$supabaseBucket}/subtitles/{$baseFileName}";
                    $ch = curl_init();
                    curl_setopt($ch, CURLOPT_URL, $supabasePublicUrl);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                    if (!empty($supabaseKey)) {
                        curl_setopt($ch, CURLOPT_HTTPHEADER, [
                            "Authorization: Bearer {$supabaseKey}",
                            "apikey: {$supabaseKey}"
                        ]);
                    }
                    $remoteData = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);

                    if ($httpCode === 200 && $remoteData !== false && strlen($remoteData) > 0) {
                        $fileContent = $remoteData;
                        // Auto-heal database record with the working remote URL
                        $db->updateOne('subtitles', ['_id' => $id], ['fileUrl' => $supabasePublicUrl]);
                    }
                }

                if (empty($fileContent)) {
                    http_response_code(404);
                    echo json_encode(['message' => 'Subtitle file not found on server']);
                    return;
                }
            }
        }

        // Count only downloads for which the file was actually resolved. A
        // missing local/remote file must not inflate the public counter.
        $downloads = ($subtitle['downloads'] ?? 0) + 1;
        try {
            $db->updateOne('subtitles', ['_id' => $id], [
                'downloads' => $downloads,
                'lastDownloadedAt' => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
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
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['message' => 'Error uploading file']);
            return;
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['srt', 'vtt', 'ass'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid subtitle format. Supported formats: SRT, VTT, ASS']);
            return;
        }

        // Delete old file if exists
        if (!empty($subtitle['fileUrl'])) {
            \Utils\Storage::deleteFile($subtitle['fileUrl']);
        }

        // Save new file
        $fileUrl = \Utils\Storage::uploadFile($file, 'subtitles');
        if (!$fileUrl) {
            http_response_code(500);
            echo json_encode(['message' => 'Failed to save new subtitle file']);
            return;
        }

        $db->updateOne('subtitles', ['_id' => $id], [
            'fileUrl' => $fileUrl,
            'format' => $ext,
            'updatedAt' => date('Y-m-d H:i:s')
        ]);

        \Utils\Cache::flush();
        \Utils\Revalidate::path('/');
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

        // Populate uploader
        foreach ($subtitles as &$sub) {
            $uploaderId = $sub['uploader'] ?? null;
            $uploader = $uploaderId ? $db->findOne('users', ['_id' => $uploaderId]) : null;
            $sub['uploader'] = $uploader ? [
                '_id' => $uploader['_id'],
                'username' => $uploader['username'],
                'email' => $uploader['email'] ?? ''
            ] : null;
        }

        header('Content-Type: application/json');
        echo json_encode($subtitles);
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
            \Utils\Revalidate::path('/');
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
            \Utils\Revalidate::path('/');
            self::revalidateMediaForSubtitle($subtitle['mediaId'], $subtitle['mediaType']);
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
        \Utils\Revalidate::path('/');
        if ($subtitle) {
            self::revalidateMediaForSubtitle($subtitle['mediaId'], $subtitle['mediaType']);
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
            
            \Utils\Cache::flush();
            if ($mediaTypeClean === 'episode') {
                $episode = $db->findOne('episodes', ['_id' => $mediaId]);
                if ($episode) {
                    if ($recordActivity) {
                        $db->updateOne('dramas', ['_id' => $episode['dramaId']], ['contentUpdatedAt' => $contentUpdatedAt]);
                    }
                    
                    $drama = $db->findOne('dramas', ['_id' => $episode['dramaId']]);
                    if ($drama && !empty($drama['slug'])) {
                        \Utils\Revalidate::media('drama', $drama['slug']);
                    }
                }
            } elseif ($mediaTypeClean === 'movie') {
                $movie = $db->findOne('movies', ['_id' => $mediaId]);
                if ($movie) {
                    if ($recordActivity) {
                        $db->updateOne('movies', ['_id' => $mediaId], ['contentUpdatedAt' => $contentUpdatedAt]);
                    }
                    if (!empty($movie['slug'])) {
                        \Utils\Revalidate::media('movie', $movie['slug']);
                    }
                }
            } else { // 'drama' or fallback
                if ($recordActivity) {
                    $db->updateOne('dramas', ['_id' => $mediaId], ['contentUpdatedAt' => $contentUpdatedAt]);
                }
                
                $drama = $db->findOne('dramas', ['_id' => $mediaId]);
                if ($drama && !empty($drama['slug'])) {
                    \Utils\Revalidate::media('drama', $drama['slug']);
                }
            }
        } catch (\Exception $e) {
            error_log("Failed to revalidate media for subtitle: " . $e->getMessage());
        }
    }
}
