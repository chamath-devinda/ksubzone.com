<?php
namespace Utils\Storage;

class SupabaseStorageProvider implements StorageProviderInterface {
    private $supabaseUrl;
    private $supabaseKey;
    private $supabaseBucket;

    public function __construct() {
        $this->supabaseUrl = rtrim(trim((string)($_ENV['SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?: '')), '/');
        $this->supabaseKey = trim((string)($_ENV['SUPABASE_KEY'] ?? getenv('SUPABASE_KEY') ?: ''));
        $this->supabaseBucket = trim((string)($_ENV['SUPABASE_BUCKET'] ?? getenv('SUPABASE_BUCKET') ?: 'Ksubzone'));
    }

    public function isConfigured(): bool {
        return (!empty($this->supabaseUrl) && !empty($this->supabaseKey));
    }

    public function getProviderName(): string {
        return 'supabase';
    }

    public function getPublicUrl(string $objectKey): string {
        if (empty($this->supabaseUrl)) return '';
        $cleanKey = ltrim($objectKey, '/');
        return "{$this->supabaseUrl}/storage/v1/object/public/{$this->supabaseBucket}/{$cleanKey}";
    }

    public function upload(array $file, string $objectKey, array $options = []) {
        if (!$this->isConfigured()) {
            error_log('SupabaseStorageProvider: missing credentials.');
            return false;
        }

        $tmpFile = $file['tmp_name'] ?? '';
        if (empty($tmpFile) || !file_exists($tmpFile)) {
            return false;
        }

        $fileData = @file_get_contents($tmpFile);
        if ($fileData === false) return false;

        $cleanKey = ltrim($objectKey, '/');
        $uploadUrl = "{$this->supabaseUrl}/storage/v1/object/{$this->supabaseBucket}/{$cleanKey}";
        $mimeType = $options['mimeType'] ?? 'application/octet-stream';
        $size = (int)($file['size'] ?? strlen($fileData));
        $checksum = $options['checksum'] ?? hash('sha256', $fileData);
        $originalFilename = $options['originalFilename'] ?? basename((string)($file['name'] ?? 'subtitle.srt'));
        $ext = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $uploadUrl,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $fileData,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$this->supabaseKey}",
                "apikey: {$this->supabaseKey}",
                "Content-Type: {$mimeType}",
                "Expect:"
            ],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 30
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 || $httpCode === 201) {
            return [
                'provider' => 'supabase',
                'bucket' => $this->supabaseBucket,
                'objectKey' => $cleanKey,
                'url' => $this->getPublicUrl($cleanKey),
                'sizeBytes' => $size,
                'checksum' => $checksum,
                'mimeType' => $mimeType,
                'format' => $ext,
                'originalFilename' => $originalFilename,
                'uploadedAt' => date('Y-m-d H:i:s')
            ];
        }

        error_log("Supabase upload failed HTTP {$httpCode}: {$response}");
        return false;
    }

    public function exists(string $objectKey): bool {
        $url = $this->getPublicUrl($objectKey);
        if (empty($url)) return false;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_NOBODY => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true
        ]);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return ($code >= 200 && $code < 300);
    }

    /**
     * Safety Rule: Do not delete any Supabase Storage object.
     * Retains source files always.
     */
    public function delete(string $objectKey): bool {
        // Intentionally no-op to protect Supabase legacy files from accidental data loss.
        return true;
    }
}
