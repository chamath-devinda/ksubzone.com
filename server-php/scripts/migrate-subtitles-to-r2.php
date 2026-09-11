<?php
/**
 * KSubZone - Cloudflare R2 Subtitle Migration Script
 * 
 * Safely and idempotently migrates legacy Supabase Storage subtitles to Cloudflare R2.
 * 
 * Safety Rules:
 * - DRY-RUN by default. Live migration requires explicit --live or --execute flag.
 * - NEVER deletes Supabase source files.
 * - Verifies SHA-256 checksum, file size, and R2 HEAD existence before updating database.
 * - Idempotent: skips already migrated records (storageProvider === 'r2').
 * - Rate-limited / small batch sizes to protect against egress spikes.
 * 
 * Usage:
 *   php server-php/scripts/migrate-subtitles-to-r2.php --dry-run
 *   php server-php/scripts/migrate-subtitles-to-r2.php --id=SUBTITLE_ID
 *   php server-php/scripts/migrate-subtitles-to-r2.php --slug=a-bona-fide-killer --limit=10
 *   php server-php/scripts/migrate-subtitles-to-r2.php --limit=20
 *   php server-php/scripts/migrate-subtitles-to-r2.php --resume
 *   php server-php/scripts/migrate-subtitles-to-r2.php --id=SUBTITLE_ID --live
 */

require_once __DIR__ . '/../utils/Dotenv.php';
\Utils\Dotenv::load(dirname(__DIR__, 2) . '/.env');
\Utils\Dotenv::load(dirname(__DIR__) . '/.env');

spl_autoload_register(function ($class) {
    $parts = explode('\\', $class);
    if (count($parts) > 1) {
        $parts[0] = strtolower($parts[0]);
    }
    $file = dirname(__DIR__) . '/' . implode('/', $parts) . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

// Robust argument parser combining getopt and $argv
$parsedArgs = [
    'dry-run' => false,
    'live' => false,
    'id' => '',
    'slug' => '',
    'limit' => 10,
    'all' => false,
    'resume' => false,
    'help' => false
];

foreach ($argv as $arg) {
    if ($arg === '--dry-run') $parsedArgs['dry-run'] = true;
    elseif ($arg === '--live' || $arg === '--execute') $parsedArgs['live'] = true;
    elseif ($arg === '--resume') $parsedArgs['resume'] = true;
    elseif ($arg === '--all') $parsedArgs['all'] = true;
    elseif ($arg === '--help' || $arg === '-h') $parsedArgs['help'] = true;
    elseif (preg_match('/^--id=(.+)$/', $arg, $m)) $parsedArgs['id'] = trim($m[1]);
    elseif (preg_match('/^--slug=(.+)$/', $arg, $m)) $parsedArgs['slug'] = trim($m[1]);
    elseif (preg_match('/^--drama=(.+)$/', $arg, $m)) $parsedArgs['slug'] = trim($m[1]);
    elseif (preg_match('/^--limit=(\d+)$/', $arg, $m)) $parsedArgs['limit'] = (int)$m[1];
}

if ($parsedArgs['help']) {
    echo <<<HELP
KSubZone Subtitle Migration Tool (Supabase -> Cloudflare R2)

Options:
  --dry-run       Simulate migration without modifying files or database (Default mode)
  --live          Execute real migration (Upload to R2 and update DB)
  --all           Migrate ALL remaining unmigrated subtitles in a continuous batch
  --id=ID         Migrate a single subtitle record by its ID
  --slug=SLUG     Migrate subtitles for a specific drama or movie slug
  --limit=N       Maximum number of subtitles to process per batch (default: 10)
  --resume        Resume migration, prioritizing unmigrated approved subtitles
  --help          Show this help message

HELP;
    exit(0);
}

// Dry-run is enforced by default unless --live or --execute is explicitly supplied
$dryRun = !$parsedArgs['live'] || $parsedArgs['dry-run'];
$isAll = $parsedArgs['all'];
$batchLimit = $isAll ? PHP_INT_MAX : max(1, (int)$parsedArgs['limit']);
$targetId = $parsedArgs['id'];
$targetSlug = $parsedArgs['slug'];

echo "======================================================\n";
echo " KSubZone Subtitle Migration: Supabase -> Cloudflare R2\n";
echo " Mode: " . ($dryRun ? "DRY-RUN (Safe simulation, NO DB/R2 changes)" : "LIVE EXECUTION (Real upload & DB updates)") . "\n";
if (!empty($targetId)) echo " Target ID: {$targetId}\n";
if (!empty($targetSlug)) echo " Target Slug: {$targetSlug}\n";
echo " Batch Mode: " . ($isAll ? "ALL REMAINING SUBTITLES" : "Limit {$batchLimit}") . "\n";
echo "======================================================\n\n";

$db = \Config\Database::getInstance();
$r2Provider = new \Utils\Storage\R2StorageProvider();

if (!$dryRun && !$r2Provider->isConfigured()) {
    echo "ERROR: Cloudflare R2 credentials are not properly configured in .env!\n";
    echo "Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME\n";
    exit(1);
}

// Build query filter
$filter = ['approvalStatus' => 'Approved'];
if (!empty($targetId)) {
    $filter['_id'] = $targetId;
}

$queryOptions = [
    'sort' => ['createdAt' => 1]
];

$allSubtitles = $db->find('subtitles', $filter, $queryOptions);

// Separate already migrated vs pending
$alreadyR2Count = 0;
$pendingCandidates = [];
foreach ($allSubtitles as $cand) {
    $p = strtolower((string)($cand['storageProvider'] ?? ''));
    $k = (string)($cand['storageObjectKey'] ?? '');
    if ($p === 'r2' && !empty($k)) {
        $alreadyR2Count++;
    } else {
        $pendingCandidates[] = $cand;
    }
}

// Select the candidates for this batch
$candidates = $isAll ? $pendingCandidates : array_slice($pendingCandidates, 0, $batchLimit);
$totalToMigrate = count($candidates);

echo "Scanned Subtitles:  " . count($allSubtitles) . "\n";
echo "Already on R2:      {$alreadyR2Count} (Skipped)\n";
echo "Pending to Migrate: " . count($pendingCandidates) . "\n";
echo "Targeting in batch: {$totalToMigrate}\n\n";

$report = [
    'dryRun' => $dryRun,
    'totalScanned' => count($candidates),
    'considered' => 0,
    'migrated' => 0,
    'skipped' => $alreadyR2Count,
    'errors' => []
];

$processedCount = 0;

foreach ($candidates as $sub) {
    if ($processedCount >= $batchLimit && empty($targetId)) {
        break;
    }

    $id = $sub['_id'] ?? '';
    $fileUrl = trim((string)($sub['fileUrl'] ?? ''));
    $provider = strtolower((string)($sub['storageProvider'] ?? 'supabase'));
    $objectKey = (string)($sub['storageObjectKey'] ?? '');

    // Skip already migrated R2 records
    if ($provider === 'r2' && !empty($objectKey)) {
        continue;
    }

    // Resolve associated media
    $mediaId = $sub['mediaId'] ?? '';
    $media = null;
    $mediaType = 'drama';

    if (!empty($mediaId)) {
        $media = $db->findOne('dramas', ['_id' => $mediaId]);
        if (!$media) {
            $media = $db->findOne('movies', ['_id' => $mediaId]);
            if ($media) $mediaType = 'movie';
        }
    }

    $mediaSlug = $media['slug'] ?? 'media-' . $mediaId;
    $mediaTitle = $media['title'] ?? 'Untitled';

    // Apply slug filter if specified
    if (!empty($targetSlug) && $mediaSlug !== $targetSlug) {
        continue;
    }

    $report['considered']++;
    $processedCount++;

    $pct = $totalToMigrate > 0 ? round(($processedCount / $totalToMigrate) * 100, 1) : 100;
    echo "\n------------------------------------------------------\n";
    echo "[{$processedCount}/{$totalToMigrate}] ({$pct}%) Processing Subtitle ID: {$id}\n";
    echo "  Media: {$mediaTitle} ({$mediaSlug}) [{$mediaType}]\n";
    echo "  Season: " . ($sub['seasonNumber'] ?? 1) . ", Episode: " . ($sub['episodeNumber'] ?? 1) . "\n";
    echo "  Language: " . ($sub['language'] ?? 'Sinhala') . ", Version: " . ($sub['version'] ?? '1.0') . "\n";
    echo "  Source URL: {$fileUrl}\n";

    if (empty($fileUrl)) {
        echo "  [ERROR] Subtitle has no source file URL.\n";
        $report['errors'][] = ['id' => $id, 'error' => 'Missing source fileUrl'];
        continue;
    }

    // Generate safe lowercase object key
    $generatedKey = \Utils\Storage::generateSubtitleObjectKey([
        'mediaSlug' => $mediaSlug,
        'mediaType' => $mediaType,
        'seasonNumber' => $sub['seasonNumber'] ?? 1,
        'episodeNumber' => $sub['episodeNumber'] ?? 1,
        'language' => $sub['language'] ?? 'sinhala',
        'version' => $sub['version'] ?? '1.0',
        'originalFilename' => basename(parse_url($fileUrl, PHP_URL_PATH) ?: 'sub.' . ($sub['format'] ?? 'srt'))
    ]);

    echo "  Target R2 Key: {$generatedKey}\n";

    // Download file from Supabase to temporary storage for inspection and upload
    $tmp = tempnam(sys_get_temp_dir(), 'ksz-sub-');
    $supabaseKey = trim((string)($_ENV['SUPABASE_KEY'] ?? getenv('SUPABASE_KEY') ?: ''));
    $headers = [
        'User-Agent: KSubZone-Migration/1.0'
    ];
    if ($supabaseKey !== '' && strpos($fileUrl, 'supabase.co') !== false) {
        $headers[] = "Authorization: Bearer {$supabaseKey}";
        $headers[] = "apikey: {$supabaseKey}";
    }

    // Candidates for downloading:
    // 1. Direct record fileUrl (or resolved through api.ksubzone.com for relative paths)
    // 2. Configured SUPABASE_URL if different project host
    // 3. Local disk cache if available
    $candidatesUrls = [];
    if (strpos($fileUrl, 'http://') === 0 || strpos($fileUrl, 'https://') === 0) {
        $candidatesUrls[] = $fileUrl;
    } elseif (strpos($fileUrl, '/') === 0) {
        $candidatesUrls[] = 'https://api.ksubzone.com' . $fileUrl;
    }
    $configuredSupabase = rtrim((string)($_ENV['SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?: ''), '/');
    if (!empty($configuredSupabase) && preg_match('#https?://[^/]+(/storage/v1/object/public/.*)$#i', $fileUrl, $m)) {
        $candidateUrl = $configuredSupabase . $m[1];
        if (!in_array($candidateUrl, $candidatesUrls, true)) {
            $candidatesUrls[] = $candidateUrl;
        }
    }

    $content = false;
    $httpCode = 0;
    $curlErr = '';

    // Check local disk first if file was ever cached or uploaded locally
    $baseName = basename(parse_url($fileUrl, PHP_URL_PATH) ?: $fileUrl);
    $localDiskPaths = [
        dirname(__DIR__) . '/uploads/subtitles/' . $baseName,
        dirname(__DIR__, 2) . '/uploads/subtitles/' . $baseName,
        dirname(__DIR__) . '/' . ltrim(parse_url($fileUrl, PHP_URL_PATH) ?: '', '/')
    ];

    foreach ($localDiskPaths as $lp) {
        if (file_exists($lp) && filesize($lp) > 0) {
            $content = @file_get_contents($lp);
            if ($content !== false && strlen($content) > 0) {
                echo "  Found locally on disk: {$lp}\n";
                $httpCode = 200;
                break;
            }
        }
    }

    // If not on local disk, try remote URLs
    if ($content === false || strlen($content) === 0) {
        foreach ($candidatesUrls as $tryUrl) {
            $ch = curl_init($tryUrl);
            $curlOpts = [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => 6,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_SSL_VERIFYPEER => true
            ];
            curl_setopt_array($ch, $curlOpts);
            $res = curl_exec($ch);
            $errNo = curl_errno($ch);
            if ($errNo === 60) {
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
                $res = curl_exec($ch);
            }
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $errStr = curl_error($ch);
            curl_close($ch);

            if ($code === 200 && $res !== false && strlen($res) > 0) {
                $content = $res;
                $httpCode = 200;
                break;
            } else {
                $httpCode = $code;
                $curlErr = $errStr;
            }
        }
    }

    if ($httpCode !== 200 || $content === false || strlen($content) === 0) {
        $errMsg = "Failed to download source from Supabase (HTTP {$httpCode}, error: {$curlErr})";
        echo "  [ERROR] {$errMsg}\n";
        $report['errors'][] = ['id' => $id, 'error' => $errMsg];
        @unlink($tmp);
        continue;
    }

    file_put_contents($tmp, $content);
    $fileSize = filesize($tmp);
    $checksum = hash_file('sha256', $tmp);
    $format = strtolower(pathinfo(basename(parse_url($fileUrl, PHP_URL_PATH) ?: ''), PATHINFO_EXTENSION) ?: ($sub['format'] ?? 'srt'));
    
    $mimeType = 'application/x-subrip; charset=utf-8';
    if ($format === 'vtt') $mimeType = 'text/vtt; charset=utf-8';
    elseif ($format === 'ass') $mimeType = 'text/plain; charset=utf-8';
    elseif ($format === 'zip') $mimeType = 'application/zip';

    echo "  File Size: {$fileSize} bytes\n";
    echo "  SHA-256: {$checksum}\n";
    echo "  MIME: {$mimeType}\n";

    if ($dryRun) {
        echo "  [DRY-RUN SUCCESS] File verified. Would upload to R2 and update DB. (No changes made)\n";
        $report['migrated']++;
        @unlink($tmp);
        continue;
    }

    // LIVE EXECUTION: Upload to R2
    $uploadFilePayload = [
        'tmp_name' => $tmp,
        'name' => basename($fileUrl),
        'size' => $fileSize,
        'error' => UPLOAD_ERR_OK
    ];

    $uploadOptions = [
        'checksum' => $checksum,
        'mimeType' => $mimeType,
        'originalFilename' => basename($fileUrl),
        'fileSize' => $fileSize
    ];

    $uploadRes = $r2Provider->upload($uploadFilePayload, $generatedKey, $uploadOptions);
    if (!$uploadRes) {
        $errMsg = "R2 upload failed for key: {$generatedKey}";
        echo "  [ERROR] {$errMsg}\n";
        $report['errors'][] = ['id' => $id, 'error' => $errMsg];
        @unlink($tmp);
        continue;
    }

    // Verify object exists in R2 via HEAD request
    if (!$r2Provider->exists($generatedKey)) {
        $errMsg = "R2 verification failed: Object does not exist in R2 bucket after upload: {$generatedKey}";
        echo "  [ERROR] {$errMsg}\n";
        $r2Provider->delete($generatedKey);
        $report['errors'][] = ['id' => $id, 'error' => $errMsg];
        @unlink($tmp);
        continue;
    }

    $r2PublicUrl = $r2Provider->getPublicUrl($generatedKey);

    // Update database record only after verification
    try {
        $db->updateOne('subtitles', ['_id' => $id], [
            'storageProvider' => 'r2',
            'storageBucket' => 'ksubzone-subtitles',
            'storageObjectKey' => $generatedKey,
            'fileUrl' => $r2PublicUrl,
            'fileSizeBytes' => $fileSize,
            'fileChecksum' => $checksum,
            'mimeType' => $mimeType,
            'uploadedAt' => date('Y-m-d H:i:s')
        ]);
        echo "  [MIGRATED] Successfully migrated to R2!\n";
        echo "  New Public URL: {$r2PublicUrl}\n";
        $report['migrated']++;
    } catch (\Throwable $e) {
        $errMsg = "Database update failed: " . $e->getMessage();
        echo "  [ERROR] {$errMsg}. Rolling back newly created R2 object.\n";
        $r2Provider->delete($generatedKey);
        $report['errors'][] = ['id' => $id, 'error' => $errMsg];
    }

    @unlink($tmp);
    usleep(30000); // 30ms polite delay to avoid overwhelming Supabase egress
}

echo "\n======================================================\n";
echo " MIGRATION SUMMARY\n";
echo " Mode: " . ($dryRun ? "DRY-RUN" : "LIVE") . "\n";
echo " Considered: {$report['considered']}\n";
echo " Migrated:   {$report['migrated']}\n";
echo " Skipped:    {$report['skipped']}\n";
echo " Errors:     " . count($report['errors']) . "\n";
echo "======================================================\n";

if (!empty($report['errors'])) {
    echo "\nErrors encountered:\n";
    foreach ($report['errors'] as $err) {
        echo "  - [ID: {$err['id']}]: {$err['error']}\n";
    }
    exit(1);
}

exit(0);
