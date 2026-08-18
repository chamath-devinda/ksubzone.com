<?php
namespace Middleware;

use Utils\Cache;

class RateLimitMiddleware {
    /**
     * Enforce rate limiting on a specific endpoint.
     * Terminate the request with a 429 response if the limit is exceeded.
     *
     * @param string $endpoint The name of the endpoint to rate limit
     * @param int $maxAttempts The maximum number of allowed requests
     * @param int $decaySeconds The timeframe in seconds before the limit resets
     */
    public static function limit(string $endpoint, int $maxAttempts = 5, int $decaySeconds = 60) {
        $ip = $_SERVER['HTTP_CF_CONNECTING_IP']
           ?? $_SERVER['HTTP_X_FORWARDED_FOR']
           ?? $_SERVER['REMOTE_ADDR']
           ?? '0.0.0.0';

        // Extract first IP in proxy chain if needed
        if (strpos($ip, ',') !== false) {
            $ip = trim(explode(',', $ip)[0]);
        }

        // Standardize IP
        $ip = trim($ip);

        // Generate cache key
        $key = "rate_limit:" . md5($ip . ":" . $endpoint);
        
        $attemptsData = Cache::get($key);

        if ($attemptsData && is_array($attemptsData)) {
            $attempts = $attemptsData['count'] ?? 0;
            $resetTime = $attemptsData['resetTime'] ?? (time() + $decaySeconds);
            
            if (time() >= $resetTime) {
                // Time window expired, reset attempts
                $attempts = 1;
                $resetTime = time() + $decaySeconds;
            } else {
                $attempts++;
            }
        } else {
            // First attempt
            $attempts = 1;
            $resetTime = time() + $decaySeconds;
        }

        $remainingTime = $resetTime - time();

        // Update the cache
        Cache::set($key, [
            'count' => $attempts,
            'resetTime' => $resetTime
        ], max(1, $remainingTime));

        // If limit is exceeded, return 429 Too Many Requests
        if ($attempts > $maxAttempts) {
            http_response_code(429);
            header('Content-Type: application/json');
            header("Retry-After: {$remainingTime}");
            echo json_encode([
                'error' => 'Too Many Requests',
                'message' => "Too many attempts on endpoint: {$endpoint}. Please try again in {$remainingTime} seconds.",
                'retryAfter' => $remainingTime
            ]);
            exit;
        }
    }
}
