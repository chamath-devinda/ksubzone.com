<?php
namespace Utils;

class Storage {
    /**
     * Uploads a file. If Supabase environment variables are configured, it uploads to Supabase Storage.
     * Otherwise, it falls back to local server storage.
     * 
     * @param array $file The $_FILES element (e.g. $_FILES['subtitle'])
     * @param string $folder The subfolder/bucket folder (e.g. 'subtitles')
     * @return string|false The URL of the uploaded file, or false on failure.
     */
    public static function uploadFile($file, $folder = 'subtitles') {
        $supabaseUrl = $_ENV['SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?: '';
        $supabaseKey = $_ENV['SUPABASE_KEY'] ?? getenv('SUPABASE_KEY') ?: '';
        $supabaseBucket = $_ENV['SUPABASE_BUCKET'] ?? getenv('SUPABASE_BUCKET') ?: 'ksubzone';

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $fileName = $folder . '-' . time() . '-' . rand(1000, 9999) . '.' . $ext;

        if (!empty($supabaseUrl) && !empty($supabaseKey)) {
            // Clean URL trailing slash
            $supabaseUrl = rtrim($supabaseUrl, '/');
            
            // Supabase REST endpoint for file upload
            $uploadUrl = "{$supabaseUrl}/storage/v1/object/{$supabaseBucket}/{$folder}/{$fileName}";
            
            $fileData = @file_get_contents($file['tmp_name']);
            if ($fileData === false) {
                error_log("Failed to read uploaded temp file: " . $file['tmp_name']);
                return false;
            }

            // Determine mime type
            $mimeType = @mime_content_type($file['tmp_name']) ?: 'application/octet-stream';
            if ($ext === 'srt') {
                $mimeType = 'text/plain'; // standard srt text type
            }

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $uploadUrl);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $fileData);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "Authorization: Bearer {$supabaseKey}",
                "apikey: {$supabaseKey}",
                "Content-Type: {$mimeType}",
                "Expect:" // Disable 100-continue for faster uploads
            ]);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4); // Force IPv4 to prevent IPv6 DNS delays

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 || $httpCode === 201) {
                // Return public access URL (requires bucket to be public)
                return "{$supabaseUrl}/storage/v1/object/public/{$supabaseBucket}/{$folder}/{$fileName}";
            } else {
                error_log("Supabase Storage Upload failed with HTTP code {$httpCode}: " . $response);
            }
        }

        // Graceful fallback: Local storage
        $targetDir = dirname(__DIR__) . '/uploads/' . $folder;
        if (!file_exists($targetDir)) {
            if (!@mkdir($targetDir, 0777, true)) {
                error_log("Failed to create local uploads directory: {$targetDir}");
                return false;
            }
        }

        $destination = $targetDir . '/' . $fileName;
        if (@move_uploaded_file($file['tmp_name'], $destination)) {
            return "/uploads/{$folder}/{$fileName}";
        }

        error_log("Failed to move uploaded file to destination: {$destination}");
        return false;
    }

    /**
     * Deletes a file from either Supabase or local storage depending on URL structure.
     * 
     * @param string $fileUrl The file path/URL to delete.
     * @return bool True if successful, false otherwise.
     */
    public static function deleteFile($fileUrl) {
        if (empty($fileUrl)) return false;

        $supabaseUrl = $_ENV['SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?: '';
        $supabaseKey = $_ENV['SUPABASE_KEY'] ?? getenv('SUPABASE_KEY') ?: '';
        $supabaseBucket = $_ENV['SUPABASE_BUCKET'] ?? getenv('SUPABASE_BUCKET') ?: 'ksubzone';

        if (!empty($supabaseUrl) && !empty($supabaseKey) && strpos($fileUrl, $supabaseUrl) === 0) {
            // It's a Supabase URL! Delete from Supabase bucket
            $publicPrefix = "/storage/v1/object/public/{$supabaseBucket}/";
            $urlPath = parse_url($fileUrl, PHP_URL_PATH);
            
            $pos = strpos($urlPath, $publicPrefix);
            if ($pos !== false) {
                $filePath = substr($urlPath, $pos + strlen($publicPrefix));
                $deleteUrl = rtrim($supabaseUrl, '/') . "/storage/v1/object/{$supabaseBucket}/{$filePath}";
                
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $deleteUrl);
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    "Authorization: Bearer {$supabaseKey}",
                    "apikey: {$supabaseKey}"
                ]);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                return ($httpCode === 200);
            }
        } else if (strpos($fileUrl, '/uploads/') === 0) {
            // Local file deletion
            $filePath = dirname(__DIR__) . $fileUrl;
            if (file_exists($filePath)) {
                return @unlink($filePath);
            }
        }

        return false;
    }
}
