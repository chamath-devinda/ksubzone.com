<?php
namespace Utils;

class Cache {
    private static $redis = null;
    private static $enabled = null;
    private static $useFileCache = false;
    private static $cacheDir = null;

    private static function init() {
        if (self::$enabled !== null) {
            return self::$enabled;
        }

        self::$cacheDir = dirname(__DIR__) . '/temp/cache';

        if (!class_exists('Redis')) {
            self::$useFileCache = true;
            self::$enabled = true;
            if (!file_exists(self::$cacheDir)) {
                @mkdir(self::$cacheDir, 0777, true);
            }
            return true;
        }

        $host = $_ENV['REDIS_HOST'] ?? getenv('REDIS_HOST') ?: '127.0.0.1';
        $port = (int)($_ENV['REDIS_PORT'] ?? getenv('REDIS_PORT') ?: 6379);
        $password = $_ENV['REDIS_PASSWORD'] ?? getenv('REDIS_PASSWORD') ?: null;

        try {
            self::$redis = new \Redis();
            $connected = @self::$redis->connect($host, $port, 1.0);
            if ($connected) {
                if ($password !== null && $password !== '') {
                    @self::$redis->auth($password);
                }
                @self::$redis->setOption(\Redis::OPT_PREFIX, 'ksubzone:');
                self::$enabled = true;
                self::$useFileCache = false;
            } else {
                self::$useFileCache = true;
                self::$enabled = true;
                if (!file_exists(self::$cacheDir)) {
                    @mkdir(self::$cacheDir, 0777, true);
                }
            }
        } catch (\Exception $e) {
            self::$useFileCache = true;
            self::$enabled = true;
            if (!file_exists(self::$cacheDir)) {
                @mkdir(self::$cacheDir, 0777, true);
            }
        }

        return self::$enabled;
    }

    /**
     * Get a cached value.
     * 
     * @param string $key
     * @return mixed|false The decoded cached value or false on failure/miss.
     */
    public static function get($key) {
        if (!self::init()) {
            return false;
        }
        if (self::$useFileCache) {
            $filePath = self::$cacheDir . '/' . md5($key) . '.cache';
            if (!file_exists($filePath)) {
                return false;
            }
            $content = @file_get_contents($filePath);
            if ($content === false) {
                return false;
            }
            $data = json_decode($content, true);
            if (!is_array($data) || !isset($data['expire']) || !isset($data['val'])) {
                @unlink($filePath);
                return false;
            }
            if (time() > $data['expire']) {
                @unlink($filePath);
                return false;
            }
            return $data['val'];
        }

        try {
            $val = self::$redis->get($key);
            if ($val === false) {
                return false;
            }
            return json_decode($val, true);
        } catch (\Exception $e) {
            error_log("Redis get error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Set a cached value.
     * 
     * @param string $key
     * @param mixed $val Value to cache (serializable to JSON)
     * @param int $ttl Time-to-live in seconds (default 1 hour)
     * @return bool
     */
    public static function set($key, $val, $ttl = 3600) {
        if (!self::init()) {
            return false;
        }
        if (self::$useFileCache) {
            $filePath = self::$cacheDir . '/' . md5($key) . '.cache';
            $data = [
                'expire' => time() + $ttl,
                'val' => $val
            ];
            $jsonVal = json_encode($data);
            return @file_put_contents($filePath, $jsonVal) !== false;
        }

        try {
            $jsonVal = json_encode($val);
            return self::$redis->setex($key, $ttl, $jsonVal);
        } catch (\Exception $e) {
            error_log("Redis set error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete a cached value.
     * 
     * @param string $key
     * @return bool
     */
    public static function delete($key) {
        if (!self::init()) {
            return false;
        }
        if (self::$useFileCache) {
            $filePath = self::$cacheDir . '/' . md5($key) . '.cache';
            if (file_exists($filePath)) {
                return @unlink($filePath);
            }
            return false;
        }

        try {
            return self::$redis->del($key) > 0;
        } catch (\Exception $e) {
            error_log("Redis delete error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Flush all prefix keys or clear all databases.
     * 
     * @return bool
     */
    public static function flush() {
        if (!self::init()) {
            return false;
        }
        if (self::$useFileCache) {
            if (file_exists(self::$cacheDir)) {
                $files = glob(self::$cacheDir . '/*.cache');
                foreach ($files as $file) {
                    if (is_file($file)) {
                        @unlink($file);
                    }
                }
            }
            return true;
        }

        try {
            // Managed/Cloud Redis providers block flushAll/flushDB commands.
            // Retrieve all matched keys under current application prefix and delete them individually.
            $keys = self::$redis->keys('*');
            if (is_array($keys) && !empty($keys)) {
                foreach ($keys as $key) {
                    self::$redis->del($key);
                }
            }
            return true;
        } catch (\Exception $e) {
            error_log("Redis flush error: " . $e->getMessage());
            // Fallback to flushAll in case KEYS is blocked but flushAll is allowed
            try {
                return self::$redis->flushAll();
            } catch (\Exception $ex) {
                error_log("Redis flushAll fallback error: " . $ex->getMessage());
                return false;
            }
        }
    }
}
