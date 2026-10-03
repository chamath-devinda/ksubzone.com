<?php
namespace Utils;

/**
 * VisitorGuard — Real unique visitor deduplication & bot filter.
 *
 * Uses SHA-256 hashed, day-scoped fingerprints stored as temp files. A
 * first-party browser nonce is preferred when supplied by the public site;
 * this prevents visitors behind the same carrier/office IP from being merged.
 * No database writes or account identifiers are involved.
 *
 * Visitor keys expire after 24 hours (one slot per browser/day, with an IP
 * fallback when browser storage is unavailable).
 */
class VisitorGuard {

    /** Directory where per-visitor marker files are stored. */
    private static $storeDir = __DIR__ . '/../temp/visitors';

    /** Known bot/crawler User-Agent substrings (case-insensitive). */
    private static $botSignatures = [
        'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
        'yandexbot', 'sogou', 'exabot', 'facebot', 'ia_archiver',
        'msnbot', 'teoma', 'alexa', 'scoutjet', 'nutch', 'seznambot',
        'petalbot', 'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot',
        'rogerbot', 'linkdexbot', 'uptimerobot', 'pingdom', 'statuscake',
        'facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp',
        'telegrambot', 'discordbot', 'slackbot', 'curl/', 'wget/',
        'python-requests', 'go-http-client', 'java/', 'libwww-perl',
        'okhttp', 'apache-httpclient', 'scrapy', 'heritrix', 'httrack',
        'wget', 'postman', 'insomnia',
    ];

    /**
     * Returns true if the current request is from a known bot/crawler.
     */
    public static function isBot(): bool {
        $ua = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');
        if (empty($ua)) return true; // no UA → treat as bot

        foreach (self::$botSignatures as $sig) {
            if (strpos($ua, $sig) !== false) {
                return true;
            }
        }
        return false;
    }

    /**
     * Returns an anonymised visitor key for the current request.
     *
     * Format: SHA256(masked_IP + today_date + $extra)
     * IP last octet is masked for privacy (192.168.1.x).
     *
     * @param string $extra  Optional extra context (e.g. content ID) to scope the key.
     */
    public static function getVisitorKey(string $extra = ''): string {
        $browserId = self::getBrowserVisitId();
        // The browser nonce is random and is never persisted by this service.
        // When it is unavailable (privacy mode/old browser), retain the
        // existing privacy-preserving IP fallback.
        $visitor = $browserId ?: self::getAnonymisedIp();
        $day = date('Y-m-d');
        return hash('sha256', $visitor . '|' . $day . '|' . $extra);
    }

    /**
     * Returns true if this visitor has already been counted today (for this key).
     */
    public static function hasVisited(string $key): bool {
        self::ensureStoreDir();
        $file = self::$storeDir . DIRECTORY_SEPARATOR . $key;
        if (!file_exists($file)) return false;

        // Expire files older than 26 hours (covers timezone drift)
        $age = time() - (int)filemtime($file);
        if ($age > 93600) {
            @unlink($file);
            return false;
        }
        return true;
    }

    /**
     * Records that this visitor has been counted (creates a tiny marker file).
     */
    public static function markVisited(string $key) {
        self::ensureStoreDir();
        $file = self::$storeDir . DIRECTORY_SEPARATOR . $key;
        @file_put_contents($file, '1');
    }

    /**
     * Convenience: returns true when the visit should be counted.
     * (Not a bot AND not already visited today for this key.)
     */
    public static function shouldCount(string $extra = ''): bool {
        if (self::isBot()) return false;
        $key = self::getVisitorKey($extra);
        if (self::hasVisited($key)) return false;
        self::markVisited($key);
        return true;
    }

    // -------------------------------------------------------------------------

    /** Returns a cryptographically anonymised version of the visitor IP (fully GDPR-compliant). */
    private static function getAnonymisedIp(): string {
        $ip = $_SERVER['HTTP_CF_CONNECTING_IP']    // Cloudflare
           ?? $_SERVER['HTTP_X_FORWARDED_FOR']     // Reverse proxy
           ?? $_SERVER['REMOTE_ADDR']
           ?? '0.0.0.0';

        // Take the first IP if comma-separated list (X-Forwarded-For)
        if (strpos($ip, ',') !== false) {
            $ip = trim(explode(',', $ip)[0]);
        }

        $maskedIp = '0.0.0.0';

        // IPv4: mask last octet  192.168.1.123 → 192.168.1.0
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $parts = explode('.', $ip);
            $parts[3] = '0';
            $maskedIp = implode('.', $parts);
        }
        // IPv6: mask interface ID / last 64 bits
        elseif (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            $parts = explode(':', $ip);
            $len   = count($parts);
            // Ensure standard 8 parts for compression expansion if needed
            for ($i = max(0, $len - 4); $i < $len; $i++) {
                $parts[$i] = '0000';
            }
            $maskedIp = implode(':', $parts);
        }

        // Salt the masked IP to prevent reverse brute-force matching
        $salt = $_ENV['JWT_SECRET'] ?? 'ksubzone_daily_secure_salt_2026';
        return hash_hmac('sha256', $maskedIp, $salt);
    }

    /**
     * Accept only the public site's random v1 visitor nonce. Never accept
     * arbitrary header data as an analytics key: it would allow unbounded
     * marker-file creation and could make the dashboard easy to inflate.
     */
    private static function getBrowserVisitId(): string {
        $visitorId = strtolower(trim($_SERVER['HTTP_X_KSUBZONE_VISITOR_ID'] ?? ''));
        return preg_match('/^v1_[a-f0-9]{32}$/', $visitorId) ? $visitorId : '';
    }

    /** Creates the visitor store directory if it does not exist. */
    private static function ensureStoreDir() {
        if (!is_dir(self::$storeDir)) {
            @mkdir(self::$storeDir, 0755, true);
        }
    }
}
