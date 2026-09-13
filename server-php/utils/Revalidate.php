<?php
namespace Utils;

class Revalidate {
    /**
     * Trigger static revalidation for a given path and tags on Next.js frontend.
     * 
     * @param string $path Route path (e.g. '/' or '/drama/moving')
     * @param array|string $tags Cache tags to purge
     * @return bool True if revalidation succeeded, false otherwise.
     */
    public static function path($path, $tags = []) {
        $nextUrl = trim($_ENV['NEXT_JS_URL'] ?? getenv('NEXT_JS_URL') ?: 'https://www.ksubzone.com');
        $token = trim($_ENV['REVALIDATION_TOKEN'] ?? getenv('REVALIDATION_TOKEN') ?: 'ksubzone_reval_secret_2026');

        if ($nextUrl === '' || $token === '') {
            error_log('Revalidation skipped: NEXT_JS_URL and REVALIDATION_TOKEN must be configured.');
            return false;
        }
        
        $url = rtrim($nextUrl, '/') . '/api/revalidate';
        
        $tagArray = [];
        if (!empty($tags)) {
            $tagArray = is_array($tags) ? array_values(array_filter($tags)) : [trim((string)$tags)];
        }

        $payload = [
            'path' => $path,
            'tags' => $tagArray
        ];

        $postData = json_encode($payload);

        // Use reliable cURL to ensure TLS handshake completes and Next.js revalidates
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-Revalidate-Secret: ' . $token
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        
        $res = curl_exec($ch);
        if ($res === false) {
            error_log("Revalidation failed for path {$path} via URL {$url}. cURL Error: " . curl_error($ch));
            curl_close($ch);
            return false;
        }

        $info = curl_getinfo($ch);
        curl_close($ch);

        if ($info['http_code'] !== 200) {
            error_log("Revalidation failed for path {$path} via URL {$url}. HTTP Status: " . $info['http_code'] . ", Response: " . $res);
            return false;
        }

        return true;
    }

    /**
     * Helper to revalidate movie or drama page.
     * 
     * @param string $type 'movie' or 'drama'
     * @param string $slug permalink slug
     * @return bool
     */
    public static function media($type, $slug) {
        $cleanType = strtolower(trim($type));
        if ($cleanType !== 'movie' && $cleanType !== 'drama') {
            return false;
        }
        $tags = ["{$cleanType}-{$slug}", "{$cleanType}s"];
        return self::path("/{$cleanType}/{$slug}", $tags);
    }

    /**
     * Refresh every public listing that can contain newly published media.
     * Also invalidates backend home and admin dashboard caches immediately.
     */
    public static function catalog($type = 'all') {
        // 1. Invalidate PHP backend internal caches immediately so next API calls return fresh data
        \Utils\Cache::delete('home_catalog_v7');
        \Utils\Cache::delete('home_catalog');
        \Utils\Cache::delete('admin_dashboard_v3');
        \Utils\Cache::flush();

        // 2. Dispatch revalidation with tags to Next.js Vercel frontend
        $type = strtolower((string)$type);
        $homeTags = ['home'];
        if ($type === 'movie' || $type === 'all') $homeTags[] = 'movies';
        if ($type === 'drama' || $type === 'all') $homeTags[] = 'dramas';

        self::path('/', $homeTags);
        if ($type === 'movie' || $type === 'all') self::path('/movies', ['movies']);
        if ($type === 'drama' || $type === 'all') self::path('/dramas', ['dramas']);
        return true;
    }
}
