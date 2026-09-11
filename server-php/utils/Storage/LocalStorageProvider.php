<?php
namespace Utils\Storage;

class LocalStorageProvider implements StorageProviderInterface {
    private $uploadsDir;

    public function __construct() {
        $this->uploadsDir = dirname(__DIR__, 2) . '/uploads';
        if (!file_exists($this->uploadsDir)) {
            @mkdir($this->uploadsDir, 0777, true);
        }
    }

    public function getProviderName(): string {
        return 'local';
    }

    public function getName(): string {
        return $this->getProviderName();
    }

    public function getPublicUrl(string $objectKey): string {
        return '/uploads/' . ltrim($objectKey, '/');
    }

    public function upload(array $file, string $objectKey, array $options = []) {
        $cleanKey = ltrim($objectKey, '/');
        $targetFile = $this->uploadsDir . '/' . $cleanKey;
        $targetDir = dirname($targetFile);

        if (!file_exists($targetDir)) {
            @mkdir($targetDir, 0777, true);
        }

        $tmpFile = $file['tmp_name'] ?? '';
        if (empty($tmpFile) || !file_exists($tmpFile)) return false;

        $body = @file_get_contents($tmpFile);
        if ($body === false) return false;

        if (@file_put_contents($targetFile, $body) === false) {
            error_log("LocalStorageProvider: failed to write file to {$targetFile}");
            return false;
        }

        $size = (int)($file['size'] ?? strlen($body));
        $checksum = $options['checksum'] ?? hash('sha256', $body);
        $originalFilename = $options['originalFilename'] ?? basename((string)($file['name'] ?? 'subtitle.srt'));
        $ext = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));

        return [
            'provider' => 'local',
            'bucket' => 'local',
            'objectKey' => $cleanKey,
            'url' => $this->getPublicUrl($cleanKey),
            'sizeBytes' => $size,
            'checksum' => $checksum,
            'mimeType' => $options['mimeType'] ?? 'text/plain',
            'format' => $ext,
            'originalFilename' => $originalFilename,
            'uploadedAt' => date('Y-m-d H:i:s')
        ];
    }

    public function exists(string $objectKey): bool {
        $cleanKey = ltrim($objectKey, '/');
        $file = $this->uploadsDir . '/' . $cleanKey;
        return file_exists($file) && !is_dir($file) && filesize($file) > 0;
    }

    public function delete(string $objectKey): bool {
        $cleanKey = ltrim($objectKey, '/');
        $file = $this->uploadsDir . '/' . $cleanKey;
        if (file_exists($file)) {
            return @unlink($file);
        }
        return true;
    }
}
