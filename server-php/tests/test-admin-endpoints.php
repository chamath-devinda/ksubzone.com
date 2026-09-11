<?php
namespace Config {
    class Database {
        public static $key = '';
        public static function getInstance() { return new self; }
        public function findOne($table, $filter = []) {
            if ($table === 'settings') return self::$key ? ['value' => self::$key] : null;
            if ($table === 'analytics') return ['trafficLogs' => [['date' => date('Y-m-d'), 'views' => 5], ['date' => '2000-01-01', 'views' => 999]]];
            return null;
        }
        public function find($table, $filter = [], $options = []) { return []; }
        public function count($table, $filter = []) { return $table === 'articles' ? 3 : 2; }
        public function sumJsonField($table, $field) { return $table === 'movies' ? 10 : 20; }
        public function getDriver() { return 'test'; }
    }
}
namespace Utils {
    class Cache {
        public static $data = [];
        public static function get($key) { return self::$data[$key] ?? false; }
        public static function set($key, $value, $ttl) { self::$data[$key] = $value; }
    }
}
namespace Controllers {
    $testStatus = 200; $testBody = '{"items":[]}'; $calls = 0;
    function curl_init($url) { return 'test-handle'; }
    function curl_setopt_array($ch, $options) { return true; }
    function curl_exec($ch) { global $testBody, $calls; $calls++; return $testBody; }
    function curl_getinfo($ch, $key) { global $testStatus; return $testStatus; }
    function curl_close($ch) {}
    function usleep($time) {}
}
namespace {
    require __DIR__ . '/../utils/AdsterraReport.php';
    require __DIR__ . '/../controllers/AdsterraController.php';
    require __DIR__ . '/../controllers/AnalyticsController.php';
    $passed = [];
    function check($condition, $message) { global $passed; if (!$condition) throw new \RuntimeException($message); $passed[] = $message; }
    function report() { ob_start(); \Controllers\AdsterraController::getStats(); return json_decode(ob_get_clean(), true); }
    $_GET = ['range' => '7', 'refresh' => '1'];
    $_ENV['ADSTERRA_API_KEY'] = '';
    $r = report(); check($r['state'] === 'configuration_required', 'Missing key is a configuration state');
    \Config\Database::$key = 'test-only-key';
    $testStatus = 200; $testBody = '{"items":[]}'; $calls = 0;
    $r = report(); check($r['state'] === 'no_activity' && $r['range'] === 7, 'Empty verified report is no activity');
    $_GET['refresh'] = '0'; $r = report(); check($calls === 1, 'Report cache avoids duplicate calls');
    $_GET['refresh'] = '1'; $r = report(); check($calls === 2, 'Refresh bypasses report cache');
    foreach ([429 => 'rate_limited', 401 => 'configuration_required', 503 => 'provider_unavailable'] as $code => $state) {
        $testStatus = $code; $calls = 0;
        $testBody = '{"message":"private provider credential details"}';
        $r = report(); check($r['state'] === $state, 'HTTP ' . $code . ' maps safely');
        check(strpos(json_encode($r), 'private provider') === false, 'Provider text redacted for ' . $code);
        check($calls === ($code === 503 ? 2 : 1), 'Retries bounded for ' . $code);
    }
    $testStatus = 200; $testBody = '{"unexpected":true}';
    check(report()['state'] === 'request_failed', 'Invalid successful envelope is not empty revenue');
    ob_start(); \Controllers\AnalyticsController::getDashboardStats(); $stats = json_decode(ob_get_clean(), true);
    check($stats['counts']['totalViews'] === 30, 'Content views do not include site visits');
    check($stats['counts']['totalTrafficViews'] === 5, '30-day traffic excludes older records');
    check($stats['counts']['totalArticles'] === 3, 'Article count included');
    check($stats['seoHealthScore'] === null, 'No invented SEO score');
    echo implode("\n", array_map(fn($x) => 'PASS: ' . $x, $passed)) . "\n" . count($passed) . " checks passed\n";
}
