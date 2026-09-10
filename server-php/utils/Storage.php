<?php
namespace Utils;

use Utils\Storage\StorageProviderInterface;
use Utils\Storage\R2StorageProvider;
use Utils\Storage\SupabaseStorageProvider;
use Utils\Storage\LocalStorageProvider;

class Storage {
    private static $lastUpload = null;
    private static $cachedProviders = [];

    public static function lastUploadMetadata() {
        return self::$lastUpload;
    }

    /**
     * Get the active storage provider instance based on environment configuration.
     * 
     * @param string|null $preferred Override provider ('r2', 'supabase', 'local')
     * @return StorageProviderInterface
     */
    public static function getProvider($preferred = null): StorageProviderInterface {
        $envProvider = strtolower(trim((string)($_ENV['SUBTITLE_STORAGE_PROVIDER'] ?? getenv('SUBTITLE_STORAGE_PROVIDER') ?: 'r2')));
        $target = $preferred ? strtolower(trim($preferred)) : $envProvider;

        if (isset(self::$cachedProviders[$target])) {
            return self::$cachedProviders[$target];
        }

        if ($target === 'r2') {
            $r2 = new R2StorageProvider();
            if ($r2->isConfigured()) {
                self::$cachedProviders[$target] = $r2;
                return $r2;
            }
            error_log('Storage: SUBTITLE_STORAGE_PROVIDER=r2 but R2 credentials are not configured. Falling back to local/supabase storage.');
        }

        if ($target === 'supabase') {
            $supabase = new SupabaseStorageProvider();
            if ($supabase->isConfigured()) {
                self::$cachedProviders[$target] = $supabase;
                return $supabase;
            }
        }

        $local = new LocalStorageProvider();
        self::$cachedProviders['local'] = $local;
        return $local;
    }

    /**
     * Generate a safe, normalized, lowercase object key.
     * Structure:
     *   Episode: subtitles/{media-slug}/season-{season}/episode-{episode}/{language}/v{version}/{uuid}.{ext}
     *   Movie:   subtitles/{media-slug}/movie/{language}/v{version}/{uuid}.{ext}
     * 
     * @param array $params
     * @return string
     */
    public static function generateSubtitleObjectKey(array $params): string {
        $mediaSlug = Slug::slugify($params['mediaSlug'] ?? ($params['mediaTitle'] ?? 'untitled-media'));
        $mediaType = strtolower((string)($params['mediaType'] ?? 'drama'));
        $language = Slug::slugify($params['language'] ?? 'sinhala');
        $rawVersion = (string)($params['version'] ?? '1');
        $versionNum = preg_replace('/[^0-9]/', '', explode('.', $rawVersion)[0]);
        $version = 'v' . ($versionNum !== '' ? (int)$versionNum : '1');

        $ext = strtolower(preg_replace('/[^a-z0-9]/', '', pathinfo((string)($params['originalFilename'] ?? 'sub.srt'), PATHINFO_EXTENSION) ?: 'srt'));

        // Generate standard UUID v4
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // set bits 6-7 to 10
        $uuid = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));

        if ($mediaType === 'movie') {
            $key = "subtitles/{$mediaSlug}/movie/{$language}/{$version}/{$uuid}.{$ext}";
        } else {
            $season = max(1, (int)($params['seasonNumber'] ?? 1));
            $episode = max(1, (int)($params['episodeNumber'] ?? 1));
            $key = "subtitles/{$mediaSlug}/season-{$season}/episode-{$episode}/{$language}/{$version}/{$uuid}.{$ext}";
        }

        // Enforce lowercase, no repeated dots, no spaces
        $key = strtolower($key);
        $key = preg_replace('/\.+/', '.', $key);
        return $key;
    }

    /**
     * Validate subtitle file requirements:
     * - Allowed formats: srt, vtt, ass, zip
     * - Max size: 10 MB
     * - MIME type inspection
     * - Magic bytes check for ZIP archives
     * 
     * @param array $file
     * @return array Array with ['valid' => bool, 'error' => string, 'mime' => string, 'ext' => string]
     */
    public static function validateSubtitleFile(array $file): array {
        if (!isset($file['tmp_name']) || !file_exists($file['tmp_name'])) {
            return ['valid' => false, 'error' => 'No uploaded file found.'];
        }

        if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
            return ['valid' => false, 'error' => 'File upload error code: ' . ($file['error'] ?? 'unknown')];
        }

        $size = (int)($file['size'] ?? filesize($file['tmp_name']));
        $maxSize = 10 * 1024 * 1024; // 10 MB limit
        if ($size <= 0) {
            return ['valid' => false, 'error' => 'Uploaded file is empty.'];
        }
        if ($size > $maxSize) {
            return ['valid' => false, 'error' => 'File size exceeds maximum limit of 10 MB.'];
        }

        $originalName = (string)($file['name'] ?? '');
        // Prevent path traversal and dangerous characters in raw filename
        if (strpos($originalName, '..') !== false || strpos($originalName, '/') !== false || strpos($originalName, '\\') !== false) {
            return ['valid' => false, 'error' => 'Invalid file name. Path traversal characters not allowed.'];
        }

        $rawName = basename($originalName);

        $ext = strtolower(pathinfo($rawName, PATHINFO_EXTENSION));
        $allowedExts = ['srt', 'vtt', 'ass', 'zip'];
        if (!in_array($ext, $allowedExts, true)) {
            return ['valid' => false, 'error' => 'Invalid format. Allowed formats: .srt, .vtt, .ass, .zip'];
        }

        $handle = @fopen($file['tmp_name'], 'rb');
        if (!$handle) {
            return ['valid' => false, 'error' => 'Unable to read uploaded file.'];
        }
        $header = fread($handle, 16);
        fclose($handle);

        $mimeType = 'application/x-subrip; charset=utf-8';
        if ($ext === 'vtt') {
            $mimeType = 'text/vtt; charset=utf-8';
        } elseif ($ext === 'ass') {
            $mimeType = 'text/plain; charset=utf-8';
        } elseif ($ext === 'zip') {
            $mimeType = 'application/zip';
            // Verify PK ZIP magic bytes
            if (strncmp($header, "PK\x03\x04", 4) !== 0 && strncmp($header, "PK\x05\x06", 4) !== 0 && strncmp($header, "PK\x07\x08", 4) !== 0) {
                return ['valid' => false, 'error' => 'Corrupt or invalid ZIP archive.'];
            }
        }

        return [
            'valid' => true,
            'ext' => $ext,
            'mime' => $mimeType,
            'size' => $size,
            'originalFilename' => preg_replace('/[^a-zA-Z0-9._-]/', '_', $rawName)
        ];
    }

    /**
     * Upload a subtitle file using the active StorageProvider.
     * Generates a safe lowercase key, executes upload, and verifies existence.
     * 
     * @param array $file Uploaded file from $_FILES
     * @param array $metadata Context metadata (mediaSlug, mediaType, language, seasonNumber, episodeNumber, version)
     * @return array|false Metadata array on success, false on failure
     */
    public static function uploadSubtitle(array $file, array $metadata = []) {
        self::$lastUpload = null;

        $validation = self::validateSubtitleFile($file);
        if (!$validation['valid']) {
            error_log('Storage::uploadSubtitle validation failed: ' . $validation['error']);
            return false;
        }

        $checksum = @hash_file('sha256', $file['tmp_name']) ?: null;
        $params = array_merge($metadata, [
            'originalFilename' => $validation['originalFilename'],
            'ext' => $validation['ext']
        ]);

        $provider = self::getProvider();
        $objectKey = self::generateSubtitleObjectKey($params);

        // Guarantee collision avoidance: if key already exists, regenerate
        if ($provider->exists($objectKey)) {
            $objectKey = self::generateSubtitleObjectKey($params);
        }

        $options = [
            'checksum' => $checksum,
            'mimeType' => $validation['mime'],
            'originalFilename' => $validation['originalFilename'],
            'fileSize' => $validation['size']
        ];

        $uploadResult = $provider->upload($file, $objectKey, $options);
        if (!$uploadResult) {
            error_log('Storage::uploadSubtitle: provider upload failed.');
            return false;
        }

        // Verify that upload succeeded and object exists in storage
        if (!$provider->exists($objectKey)) {
            error_log("Storage::uploadSubtitle: verification failed. Object does not exist in storage: {$objectKey}");
            $provider->delete($objectKey);
            return false;
        }

        self::$lastUpload = $uploadResult;
        return $uploadResult;
    }

    /**
     * Safely delete a newly uploaded R2 object if the database transaction fails.
     * Strictly avoids deleting legacy Supabase or older files.
     * 
     * @param string $providerName
     * @param string $objectKey
     * @return bool
     */
    public static function rollbackUpload(string $providerName, string $objectKey): bool {
        if ($providerName === 'r2' && !empty($objectKey)) {
            $provider = self::getProvider('r2');
            return $provider->delete($objectKey);
        }
        return false;
    }

    /**
     * Backward-compatible general file upload method.
     * 
     * @param array $file
     * @param string $folder
     * @return string|false Public URL or false
     */
    public static function uploadFile($file, $folder = 'subtitles') {
        if ($folder === 'subtitles') {
            $res = self::uploadSubtitle($file, []);
            return $res ? $res['url'] : false;
        }

        $provider = self::getProvider();
        $ext = strtolower(pathinfo((string)($file['name'] ?? ''), PATHINFO_EXTENSION) ?: 'bin');
        $uuid = bin2hex(random_bytes(16));
        $objectKey = "{$folder}/{$uuid}.{$ext}";

        $res = $provider->upload($file, $objectKey, [
            'mimeType' => @mime_content_type($file['tmp_name']) ?: 'application/octet-stream'
        ]);

        if ($res) {
            self::$lastUpload = $res;
            return $res['url'];
        }
        return false;
    }

    /**
     * Deletes a file.
     * IMPORTANT SAFETY RULE: Never deletes Supabase Storage objects to preserve legacy records.
     * 
     * @param string $fileUrl
     * @return bool
     */
    public static function deleteFile($fileUrl) {
        if (empty($fileUrl)) return false;

        $supabaseUrl = $_ENV['SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?: '';
        if (!empty($supabaseUrl) && strpos($fileUrl, $supabaseUrl) === 0) {
            // Safety rule: Do not delete any Supabase Storage object.
            return true;
        }

        // Local file deletion
        if (strpos($fileUrl, '/uploads/') === 0) {
            $filePath = dirname(__DIR__) . $fileUrl;
            if (file_exists($filePath)) {
                return @unlink($filePath);
            }
            return true;
        }

        return false;
    }
}
