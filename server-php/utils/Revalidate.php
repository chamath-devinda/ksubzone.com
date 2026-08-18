<?php
namespace Utils;

class Revalidate {
    /**
     * Trigger static revalidation for a given path on Next.js frontend.
     * 
     * @param string $path Route path (e.g. '/' or '/drama/moving')
     * @return bool True if revalidation succeeded, false otherwise.
     */
    public static function path($path) {
        $nextUrl = $_ENV['NEXT_JS_URL'] ?? getenv('NEXT_JS_URL') ?: 'http://127.0.0.1:5173';
        $token = $_ENV['REVALIDATION_TOKEN'] ?? getenv('REVALIDATION_TOKEN') ?: 'ksubzone_reval_secret_2026';
        
        $url = rtrim($nextUrl, '/') . '/api/revalidate?secret=' . urlencode($token);
        
        // 1. Attempt non-blocking fire-and-forget socket connection (extremely fast)
        $socketSucceeded = false;
        try {
            $parts = parse_url($url);
            $host = $parts['host'] ?? '127.0.0.1';
            $port = $parts['port'] ?? ($parts['scheme'] === 'https' ? 443 : 80);
            $pathQuery = ($parts['path'] ?? '/api/revalidate') . (isset($parts['query']) ? '?' . $parts['query'] : '');
            $prefix = ($parts['scheme'] === 'https') ? 'ssl://' : '';
            
            // Connect with a tiny timeout (0.5s) to prevent blocking
            $fp = @fsockopen($prefix . $host, $port, $errno, $errstr, 0.5);
            if ($fp) {
                stream_set_blocking($fp, 0); // Non-blocking mode
                $postData = json_encode(['path' => $path]);
                
                $out = "POST " . $pathQuery . " HTTP/1.1\r\n";
                $out .= "Host: " . $host . "\r\n";
                $out .= "Content-Type: application/json\r\n";
                $out .= "Content-Length: " . strlen($postData) . "\r\n";
                $out .= "Connection: Close\r\n\r\n";
                $out .= $postData;
                
                fwrite($fp, $out);
                fclose($fp);
                $socketSucceeded = true;
            }
        } catch (\Exception $e) {
            // Ignore socket failure and fallback
        }
        
        if ($socketSucceeded) {
            return true;
        }
        
        // 2. Fallback to fast cURL with low timeouts to avoid blocking the main thread
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['path' => $path]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT_MS, 150);
        curl_setopt($ch, CURLOPT_TIMEOUT_MS, 300);
        
        $res = curl_exec($ch);
        if ($res === false) {
            error_log("Revalidation failed for path {$path} via URL {$url}. cURL Error: " . curl_error($ch));
        } else {
            $info = curl_getinfo($ch);
            if ($info['http_code'] !== 200) {
                error_log("Revalidation failed for path {$path} via URL {$url}. HTTP Status: " . $info['http_code'] . ", Response: " . $res);
            }
        }
        curl_close($ch);
        return true;
    }

    /**
     * Helper to revalidate movie or drama page.
     * 
     * @param string $type 'movie' or 'drama'
     * @param string $slugpermalink slug
     * @return bool
     */
    public static function media($type, $slug) {
        $cleanType = strtolower($type);
        if ($cleanType !== 'movie' && $cleanType !== 'drama') {
            return false;
        }
        return self::path("/{$cleanType}/{$slug}");
    }
}
