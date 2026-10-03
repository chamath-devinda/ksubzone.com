<?php
require_once __DIR__ . '/../utils/VisitorGuard.php';

function check($condition, $name) {
    if (!$condition) throw new RuntimeException('FAIL: ' . $name);
    echo 'PASS: ' . $name . PHP_EOL;
}

$_ENV['JWT_SECRET'] = 'test-only-secret';
$_SERVER['REMOTE_ADDR'] = '203.0.113.42';
$_SERVER['HTTP_USER_AGENT'] = 'Mozilla/5.0';

$_SERVER['HTTP_X_KSUBZONE_VISITOR_ID'] = 'v1_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
$firstBrowserKey = \Utils\VisitorGuard::getVisitorKey('api_visit');

$_SERVER['HTTP_X_KSUBZONE_VISITOR_ID'] = 'v1_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
$secondBrowserKey = \Utils\VisitorGuard::getVisitorKey('api_visit');
check($firstBrowserKey !== $secondBrowserKey, 'Distinct browser nonces on one IP remain distinct');

$_SERVER['HTTP_X_KSUBZONE_VISITOR_ID'] = 'not-a-valid-browser-id';
$fallbackKey = \Utils\VisitorGuard::getVisitorKey('api_visit');
check($fallbackKey !== $firstBrowserKey && $fallbackKey !== $secondBrowserKey, 'Invalid visitor header falls back safely');

unset($_SERVER['HTTP_X_KSUBZONE_VISITOR_ID']);
check($fallbackKey === \Utils\VisitorGuard::getVisitorKey('api_visit'), 'IP fallback is stable for the day');
