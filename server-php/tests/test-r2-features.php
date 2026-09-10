<?php
/**
 * Test suite for KSubZone Cloudflare R2 Storage & Validation
 * 
 * Verifies:
 * - Environment validation
 * - Safe lowercase object key generation & sanitization
 * - Path traversal prevention
 * - Extension and size validation
 * - MIME types
 * - No-op deletion protection for Supabase legacy objects
 * - Rollback logic
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

$passed = 0;
$failed = 0;

function assertTest($condition, $testName) {
    global $passed, $failed;
    if ($condition) {
        echo "  [PASS] {$testName}\n";
        $passed++;
    } else {
        echo "  [FAIL] {$testName}\n";
        $failed++;
    }
}

echo "Running PHP R2 & Storage Test Suite...\n\n";

// 1. Safe lowercase object key generation
echo "Test Group 1: Object Key Generation\n";
$key1 = \Utils\Storage::generateSubtitleObjectKey([
    'mediaSlug' => 'A-Bona-Fide-Killer',
    'seasonNumber' => 1,
    'episodeNumber' => 12,
    'language' => 'Sinhala',
    'version' => '1.0',
    'originalFilename' => 'My..Subtitle...srt'
]);

assertTest(strtolower($key1) === $key1, "Generated key must be strictly lowercase: {$key1}");
assertTest(strpos($key1, 'subtitles/a-bona-fide-killer/season-1/episode-12/sinhala/v1/') === 0, "Key prefix must follow standard path structure");
assertTest(strpos($key1, '..') === false, "Repeated dots must be eliminated from key path");
assertTest(strpos($key1, ' ') === false, "Key must not contain spaces");
assertTest(substr($key1, -4) === '.srt', "Key must end with .srt extension");

// Test key uniqueness
$key2 = \Utils\Storage::generateSubtitleObjectKey([
    'mediaSlug' => 'A-Bona-Fide-Killer',
    'seasonNumber' => 1,
    'episodeNumber' => 12,
    'language' => 'Sinhala',
    'version' => '1.0',
    'originalFilename' => 'My..Subtitle...srt'
]);
assertTest($key1 !== $key2, "Consecutive keys for same metadata must have unique UUIDs");

// Test movie key path
$movieKey = \Utils\Storage::generateSubtitleObjectKey([
    'mediaSlug' => 'Parasite',
    'mediaType' => 'movie',
    'language' => 'Sinhala',
    'version' => '2.0',
    'originalFilename' => 'parasite.vtt'
]);
assertTest(strpos($movieKey, 'subtitles/parasite/movie/sinhala/v2/') === 0, "Movie key path must use /movie/ instead of season/episode");
assertTest(substr($movieKey, -4) === '.vtt', "Movie key must have .vtt extension");

// 2. Subtitle File Validation
echo "\nTest Group 2: Subtitle File Validation & Security\n";

// 2.1 Oversized file rejection
$tmpOversized = tempnam(sys_get_temp_dir(), 'test_over_');
file_put_contents($tmpOversized, 'dummy');
$oversizedValidation = \Utils\Storage::validateSubtitleFile([
    'tmp_name' => $tmpOversized,
    'name' => 'large.srt',
    'size' => 11 * 1024 * 1024, // 11 MB
    'error' => UPLOAD_ERR_OK
]);
assertTest($oversizedValidation['valid'] === false, "Oversized file (>10MB) must be rejected");
@unlink($tmpOversized);

// 2.2 Path traversal in filename
$tmpTraversal = tempnam(sys_get_temp_dir(), 'test_trav_');
file_put_contents($tmpTraversal, '1\n00:00:01,000 --> 00:00:04,000\nHello');
$traversalValidation = \Utils\Storage::validateSubtitleFile([
    'tmp_name' => $tmpTraversal,
    'name' => '../../etc/passwd.srt',
    'size' => 50,
    'error' => UPLOAD_ERR_OK
]);
assertTest($traversalValidation['valid'] === false, "Path traversal in filename (../../) must be rejected");
@unlink($tmpTraversal);

// 2.3 Unsupported executable file rejection
$tmpExe = tempnam(sys_get_temp_dir(), 'test_exe_');
file_put_contents($tmpExe, 'MZ9000000');
$exeValidation = \Utils\Storage::validateSubtitleFile([
    'tmp_name' => $tmpExe,
    'name' => 'malicious.exe',
    'size' => 100,
    'error' => UPLOAD_ERR_OK
]);
assertTest($exeValidation['valid'] === false, "Unsupported format (.exe) must be rejected");
@unlink($tmpExe);

// 2.4 Valid .srt file
$tmpSrt = tempnam(sys_get_temp_dir(), 'test_srt_');
file_put_contents($tmpSrt, "1\r\n00:00:01,000 --> 00:00:04,000\r\nSample subtitle");
$srtValidation = \Utils\Storage::validateSubtitleFile([
    'tmp_name' => $tmpSrt,
    'name' => 'valid_sub.srt',
    'size' => filesize($tmpSrt),
    'error' => UPLOAD_ERR_OK
]);
assertTest($srtValidation['valid'] === true, "Valid .srt file must be accepted");
assertTest($srtValidation['mime'] === 'application/x-subrip; charset=utf-8', "Valid .srt must have correct MIME");
@unlink($tmpSrt);

// 2.5 Valid .vtt file
$tmpVtt = tempnam(sys_get_temp_dir(), 'test_vtt_');
file_put_contents($tmpVtt, "WEBVTT\r\n\r\n00:00:01.000 --> 00:00:04.000\r\nHello");
$vttValidation = \Utils\Storage::validateSubtitleFile([
    'tmp_name' => $tmpVtt,
    'name' => 'valid_sub.vtt',
    'size' => filesize($tmpVtt),
    'error' => UPLOAD_ERR_OK
]);
assertTest($vttValidation['valid'] === true, "Valid .vtt file must be accepted");
assertTest($vttValidation['mime'] === 'text/vtt; charset=utf-8', "Valid .vtt must have text/vtt MIME");
@unlink($tmpVtt);

// 2.6 Valid .ass file
$tmpAss = tempnam(sys_get_temp_dir(), 'test_ass_');
file_put_contents($tmpAss, "[Script Info]\nTitle: Test");
$assValidation = \Utils\Storage::validateSubtitleFile([
    'tmp_name' => $tmpAss,
    'name' => 'valid_sub.ass',
    'size' => filesize($tmpAss),
    'error' => UPLOAD_ERR_OK
]);
assertTest($assValidation['valid'] === true, "Valid .ass file must be accepted");
assertTest($assValidation['mime'] === 'text/plain; charset=utf-8', "Valid .ass must have text/plain MIME");
@unlink($tmpAss);

// 2.7 Invalid ZIP file (missing PK header)
$tmpFakeZip = tempnam(sys_get_temp_dir(), 'test_fake_zip_');
file_put_contents($tmpFakeZip, "NOT A REAL ZIP FILE CONTENT");
$fakeZipValidation = \Utils\Storage::validateSubtitleFile([
    'tmp_name' => $tmpFakeZip,
    'name' => 'invalid.zip',
    'size' => filesize($tmpFakeZip),
    'error' => UPLOAD_ERR_OK
]);
assertTest($fakeZipValidation['valid'] === false, "Fake ZIP file without PK magic bytes must be rejected");
@unlink($tmpFakeZip);

// 2.8 Valid ZIP file (with PK magic bytes)
$tmpValidZip = tempnam(sys_get_temp_dir(), 'test_valid_zip_');
file_put_contents($tmpValidZip, "PK\x03\x04" . str_repeat("\x00", 26));
$validZipValidation = \Utils\Storage::validateSubtitleFile([
    'tmp_name' => $tmpValidZip,
    'name' => 'valid.zip',
    'size' => filesize($tmpValidZip),
    'error' => UPLOAD_ERR_OK
]);
assertTest($validZipValidation['valid'] === true, "Valid ZIP file with PK header must be accepted");
assertTest($validZipValidation['mime'] === 'application/zip', "Valid ZIP must have application/zip MIME");
@unlink($tmpValidZip);

// 3. Storage Deletion Safety Rules (Never delete Supabase source files)
echo "\nTest Group 3: Supabase Object Deletion Safety\n";
$supabaseUrl = 'https://dyypaoupfdpqpczbppfc.supabase.co/storage/v1/object/public/Ksubzone/subtitles/test.srt';
$deleteResult = \Utils\Storage::deleteFile($supabaseUrl);
assertTest($deleteResult === true, "Calling delete on Supabase URL must be a safe no-op returning true without deleting");

// 4. R2 URL Resolution
echo "\nTest Group 4: R2 URL Resolution\n";
$r2Provider = new \Utils\Storage\R2StorageProvider();
$publicUrl = $r2Provider->getPublicUrl('subtitles/a-bona-fide-killer/season-1/episode-1/sinhala/v1/test.srt');
assertTest(strpos($publicUrl, 'https://files.ksubzone.com/subtitles/a-bona-fide-killer/season-1/episode-1/sinhala/v1/test.srt') === 0, "Public URL must use custom public domain https://files.ksubzone.com");

// 5. Rollback safety
echo "\nTest Group 5: Rollback logic\n";
$rollbackSupabase = \Utils\Storage::rollbackUpload('supabase', 'any-key');
assertTest($rollbackSupabase === false, "Rollback must never attempt to delete supabase provider objects");

echo "\n======================================================\n";
echo " PHP Test Results: Passed={$passed}, Failed={$failed}\n";
echo "======================================================\n";

exit($failed > 0 ? 1 : 0);
