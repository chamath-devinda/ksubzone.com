<?php
namespace Utils\Storage;

class R2StorageProvider implements StorageProviderInterface {
    private $accountId;
    private $accessKeyId;
    private $secretAccessKey;
    private $bucketName;
    private $endpoint;
    private $publicBaseUrl;

    public function __construct() {
        $this->accountId = trim((string)($_ENV['R2_ACCOUNT_ID'] ?? getenv('R2_ACCOUNT_ID') ?: ''));
        $this->accessKeyId = trim((string)($_ENV['R2_ACCESS_KEY_ID'] ?? getenv('R2_ACCESS_KEY_ID') ?: ''));
        $this->secretAccessKey = trim((string)($_ENV['R2_SECRET_ACCESS_KEY'] ?? getenv('R2_SECRET_ACCESS_KEY') ?: ''));
        $this->bucketName = trim((string)($_ENV['R2_BUCKET_NAME'] ?? getenv('R2_BUCKET_NAME') ?: 'ksubzone-subtitles'));
        $this->publicBaseUrl = rtrim(trim((string)($_ENV['R2_PUBLIC_BASE_URL'] ?? getenv('R2_PUBLIC_BASE_URL') ?: 'https://files.ksubzone.com')), '/');

        $defaultEndpoint = $this->accountId !== '' ? "https://{$this->accountId}.r2.cloudflarestorage.com" : '';
        $this->endpoint = rtrim(trim((string)($_ENV['R2_ENDPOINT'] ?? getenv('R2_ENDPOINT') ?: $defaultEndpoint)), '/');
    }

    public function isConfigured(): bool {
        return ($this->accessKeyId !== '' && $this->secretAccessKey !== '' && $this->bucketName !== '' && $this->endpoint !== '');
    }

    public function getProviderName(): string {
        return 'r2';
    }

    public function getName(): string {
        return $this->getProviderName();
    }

    public function getPublicUrl(string $objectKey): string {
        $encodedPath = implode('/', array_map('rawurlencode', explode('/', ltrim($objectKey, '/'))));
        return $this->publicBaseUrl . '/' . $encodedPath;
    }

    public function upload(array $file, string $objectKey, array $options = []) {
        if (!$this->isConfigured()) {
            error_log('R2StorageProvider: missing required credentials.');
            return false;
        }

        $tmpFile = $file['tmp_name'] ?? '';
        if (empty($tmpFile) || !file_exists($tmpFile)) {
            error_log('R2StorageProvider: tmp_name does not exist.');
            return false;
        }

        $body = @file_get_contents($tmpFile);
        if ($body === false) {
            error_log('R2StorageProvider: failed to read file content.');
            return false;
        }

        $size = (int)($file['size'] ?? strlen($body));
        $checksum = $options['checksum'] ?? hash('sha256', $body);
        $mimeType = $options['mimeType'] ?? 'application/x-subrip; charset=utf-8';
        $originalFilename = $options['originalFilename'] ?? basename((string)($file['name'] ?? 'subtitle.srt'));
        $safeDispositionName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalFilename);
        $ext = strtolower(pathinfo($safeDispositionName, PATHINFO_EXTENSION));

        $path = '/' . $this->bucketName . '/' . str_replace('%2F', '/', rawurlencode(ltrim($objectKey, '/')));
        $url = $this->endpoint . $path;
        $host = parse_url($this->endpoint, PHP_URL_HOST);

        $amzDate = gmdate('Ymd\THis\Z');
        $date = gmdate('Ymd');
        $region = 'auto';
        $service = 's3';

        $payloadHash = hash('sha256', $body);
        $canonicalHeaders = "host:{$host}\n" . "x-amz-content-sha256:{$payloadHash}\n" . "x-amz-date:{$amzDate}\n";
        $signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
        $canonicalRequest = "PUT\n{$path}\n\n{$canonicalHeaders}\n{$signedHeaders}\n{$payloadHash}";
        $scope = "{$date}/{$region}/{$service}/aws4_request";

        $kDate = hash_hmac('sha256', $date, 'AWS4' . $this->secretAccessKey, true);
        $kRegion = hash_hmac('sha256', $region, $kDate, true);
        $kService = hash_hmac('sha256', $service, $kRegion, true);
        $signingKey = hash_hmac('sha256', 'aws4_request', $kService, true);
        $signature = hash_hmac('sha256', "AWS4-HMAC-SHA256\n{$amzDate}\n{$scope}\n" . hash('sha256', $canonicalRequest), $signingKey);
        $authorization = "AWS4-HMAC-SHA256 Credential={$this->accessKeyId}/{$scope}, SignedHeaders={$signedHeaders}, Signature={$signature}";

        $headers = [
            "Authorization: {$authorization}",
            "Content-Type: {$mimeType}",
            "Content-Disposition: attachment; filename=\"{$safeDispositionName}\"",
            "Cache-Control: public, max-age=31536000, immutable",
            "x-amz-content-sha256: {$payloadHash}",
            "x-amz-date: {$amzDate}",
            "x-amz-meta-checksum-sha256: {$checksum}",
            "Expect:"
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => 'PUT',
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_TIMEOUT => 35,
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $res = $this->executeCurl($ch);
        $status = $res['status'];
        $response = $res['response'];
        $curlError = $res['error'];

        if ($status < 200 || $status >= 300) {
            error_log("R2 upload failed: HTTP {$status}, error: {$curlError}, response: {$response}");
            return false;
        }

        return [
            'provider' => 'r2',
            'bucket' => $this->bucketName,
            'objectKey' => ltrim($objectKey, '/'),
            'url' => $this->getPublicUrl($objectKey),
            'sizeBytes' => $size,
            'checksum' => $checksum,
            'mimeType' => $mimeType,
            'format' => $ext,
            'originalFilename' => $originalFilename,
            'uploadedAt' => date('Y-m-d H:i:s')
        ];
    }

    public function exists(string $objectKey): bool {
        if (!$this->isConfigured()) return false;

        $path = '/' . $this->bucketName . '/' . str_replace('%2F', '/', rawurlencode(ltrim($objectKey, '/')));
        $url = $this->endpoint . $path;
        $host = parse_url($this->endpoint, PHP_URL_HOST);

        $amzDate = gmdate('Ymd\THis\Z');
        $date = gmdate('Ymd');
        $region = 'auto';
        $service = 's3';

        $payloadHash = hash('sha256', '');
        $canonicalHeaders = "host:{$host}\n" . "x-amz-content-sha256:{$payloadHash}\n" . "x-amz-date:{$amzDate}\n";
        $signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
        $canonicalRequest = "HEAD\n{$path}\n\n{$canonicalHeaders}\n{$signedHeaders}\n{$payloadHash}";
        $scope = "{$date}/{$region}/{$service}/aws4_request";

        $kDate = hash_hmac('sha256', $date, 'AWS4' . $this->secretAccessKey, true);
        $kRegion = hash_hmac('sha256', $region, $kDate, true);
        $kService = hash_hmac('sha256', $service, $kRegion, true);
        $signingKey = hash_hmac('sha256', 'aws4_request', $kService, true);
        $signature = hash_hmac('sha256', "AWS4-HMAC-SHA256\n{$amzDate}\n{$scope}\n" . hash('sha256', $canonicalRequest), $signingKey);
        $authorization = "AWS4-HMAC-SHA256 Credential={$this->accessKeyId}/{$scope}, SignedHeaders={$signedHeaders}, Signature={$signature}";

        $headers = [
            "Authorization: {$authorization}",
            "x-amz-content-sha256: {$payloadHash}",
            "x-amz-date: {$amzDate}"
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_NOBODY => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $res = $this->executeCurl($ch);
        $status = $res['status'];
        return ($status >= 200 && $status < 300);
    }

    public function delete(string $objectKey): bool {
        if (!$this->isConfigured() || empty($objectKey)) return false;

        $path = '/' . $this->bucketName . '/' . str_replace('%2F', '/', rawurlencode(ltrim($objectKey, '/')));
        $url = $this->endpoint . $path;
        $host = parse_url($this->endpoint, PHP_URL_HOST);

        $amzDate = gmdate('Ymd\THis\Z');
        $date = gmdate('Ymd');
        $region = 'auto';
        $service = 's3';

        $payloadHash = hash('sha256', '');
        $canonicalHeaders = "host:{$host}\n" . "x-amz-content-sha256:{$payloadHash}\n" . "x-amz-date:{$amzDate}\n";
        $signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
        $canonicalRequest = "DELETE\n{$path}\n\n{$canonicalHeaders}\n{$signedHeaders}\n{$payloadHash}";
        $scope = "{$date}/{$region}/{$service}/aws4_request";

        $kDate = hash_hmac('sha256', $date, 'AWS4' . $this->secretAccessKey, true);
        $kRegion = hash_hmac('sha256', $region, $kDate, true);
        $kService = hash_hmac('sha256', $service, $kRegion, true);
        $signingKey = hash_hmac('sha256', 'aws4_request', $kService, true);
        $signature = hash_hmac('sha256', "AWS4-HMAC-SHA256\n{$amzDate}\n{$scope}\n" . hash('sha256', $canonicalRequest), $signingKey);
        $authorization = "AWS4-HMAC-SHA256 Credential={$this->accessKeyId}/{$scope}, SignedHeaders={$signedHeaders}, Signature={$signature}";

        $headers = [
            "Authorization: {$authorization}",
            "x-amz-content-sha256: {$payloadHash}",
            "x-amz-date: {$amzDate}"
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => 'DELETE',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $res = $this->executeCurl($ch);
        $status = $res['status'];
        return ($status === 200 || $status === 204);
    }

    /**
     * Execute cURL with automatic fallback for systems missing local SSL CA bundle.
     */
    private function executeCurl($ch): array {
        $response = curl_exec($ch);
        $errNo = curl_errno($ch);

        if ($errNo === 60) { // CURLE_PEER_FAILED_VERIFICATION
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            $response = curl_exec($ch);
        }

        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        return [
            'status' => $status,
            'response' => $response,
            'error' => $error
        ];
    }
}
