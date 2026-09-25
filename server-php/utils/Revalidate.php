<?php
namespace Utils;

class Revalidate {
    private static $pending = [];
    private static $shutdownRegistered = false;

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
        
        $tagArray = [];
        if (!empty($tags)) {
            $tagArray = is_array($tags) ? array_values(array_filter($tags)) : [trim((string)$tags)];
        }

        // Revalidation is post-response maintenance. Running several remote
        // requests inline made successful admin writes exceed the browser's
        // timeout and appear to fail. Merge all paths and tags into one request;
        // the shutdown handler dispatches it after the JSON response is sent.
        $url = rtrim($nextUrl, '/') . '/api/revalidate';
        $key = $url . '|' . $token;
        if (!isset(self::$pending[$key])) {
            self::$pending[$key] = [
                'url' => $url,
                'token' => $token,
                'paths' => [],
                'tags' => []
            ];
        }

        if (is_string($path) && trim($path) !== '') {
            self::$pending[$key]['paths'][trim($path)] = true;
        }
        foreach ($tagArray as $tag) {
            $tag = trim((string)$tag);
            if ($tag !== '') self::$pending[$key]['tags'][$tag] = true;
        }

        if (!self::$shutdownRegistered) {
            self::$shutdownRegistered = true;
            register_shutdown_function([self::class, 'flushPending']);
        }

        return true;
    }

    /**
     * Dispatch queued revalidation requests concurrently after the response.
     */
    public static function flushPending() {
        if (empty(self::$pending)) {
            return;
        }

        $requests = array_values(self::$pending);
        self::$pending = [];

        // On PHP-FPM this sends the completed JSON response to the browser
        // while the best-effort cache refresh continues in the background.
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        }

        $multi = curl_multi_init();
        $handles = [];

        foreach ($requests as $request) {
            $payload = [
                'paths' => array_keys($request['paths']),
                'tags' => array_keys($request['tags'])
            ];
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $request['url']);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'X-Revalidate-Secret: ' . $request['token']
            ]);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3);
            curl_multi_add_handle($multi, $ch);
            $handles[] = [$ch, $request, $payload];
        }

        do {
            $status = curl_multi_exec($multi, $running);
            if ($running) {
                curl_multi_select($multi, 0.5);
            }
        } while ($running && $status === CURLM_OK);

        foreach ($handles as $item) {
            $ch = $item[0];
            $request = $item[1];
            $payload = $item[2];
            $body = curl_multi_getcontent($ch);
            $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            if ($error !== '' || $httpCode !== 200) {
                error_log(
                    'Revalidation failed for paths ' . implode(', ', $payload['paths']) .
                    ($error !== '' ? '. cURL Error: ' . $error : '. HTTP Status: ' . $httpCode . ', Response: ' . $body)
                );
            }
            curl_multi_remove_handle($multi, $ch);
            curl_close($ch);
        }

        curl_multi_close($multi);
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
        // 1. Invalidate only catalog-shaped backend caches. A global flush can
        // evict auth/settings caches and makes every admin write unnecessarily slow.
        \Utils\Cache::delete('home_catalog_v7');
        \Utils\Cache::delete('home_catalog');
        \Utils\Cache::delete('admin_dashboard_v3');
        \Utils\Cache::deleteByPrefix('admin_missing_subtitle_alerts_v1_');

        // 2. Dispatch revalidation with tags to Next.js Vercel frontend
        $type = strtolower((string)$type);
        $homeTags = ['home'];
        if ($type === 'movie' || $type === 'all') $homeTags[] = 'movies';
        if ($type === 'drama' || $type === 'all') $homeTags[] = 'dramas';

        self::path('/', $homeTags);
        if ($type === 'movie' || $type === 'all') {
            \Utils\Cache::deleteByPrefix('search_movies_v2_');
            self::path('/movies', ['movies']);
        }
        if ($type === 'drama' || $type === 'all') {
            \Utils\Cache::deleteByPrefix('search_dramas_v2_');
            self::path('/dramas', ['dramas']);
        }
        return true;
    }
}
