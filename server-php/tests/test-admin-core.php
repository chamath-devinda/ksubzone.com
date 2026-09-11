<?php
require_once __DIR__ . '/../utils/AdsterraReport.php';
require_once __DIR__ . '/../utils/JWT.php';

$checks = 0;
function check($condition, $name) {
    global $checks;
    if (!$condition) throw new RuntimeException('FAIL: ' . $name);
    $checks++; echo 'PASS: ' . $name . PHP_EOL;
}
$report = \Utils\AdsterraReport::normalize(['items' => [
    ['date' => '2026-09-01', 'impression' => '1000', 'clicks' => '20', 'revenue' => '2.5'],
    ['date' => '2026-09-01', 'impressions' => 1000, 'clicks' => 10, 'profit' => 1.5]
]], '2026-09-01', '2026-09-07');
check(count($report['daily']) === 1, 'Duplicate provider dates aggregate');
check($report['summary']['revenue'] === 4.0 && $report['summary']['cpm'] === 2.0 && $report['summary']['ctr'] === 1.5, 'Weighted CPM and CTR');
$empty = \Utils\AdsterraReport::normalize(['items' => []], '2026-09-01', '2026-09-07');
check($empty['summary']['ctr'] === 0 && $empty['daily'] === [], 'Empty report avoids division by zero');
foreach ([['error' => 'secret provider text'], ['items' => [['date' => 'not-a-date']]], ['items' => [['date' => '2026-09-01', 'impressions' => 'bad', 'clicks' => 0, 'revenue' => 0]]]] as $payload) {
    $rejected = false;
    try { \Utils\AdsterraReport::normalize($payload, '2026-09-01', '2026-09-07'); } catch (UnexpectedValueException $e) { $rejected = true; }
    check($rejected, 'Malformed provider data rejected');
}
$secret = str_repeat('test-only-', 5);
$token = \Utils\JWT::sign(['id' => 'abc123', 'role' => 'admin'], $secret);
check(\Utils\JWT::verify($token, $secret)['role'] === 'admin', 'Signed admin token verified');
check(\Utils\JWT::verify($token . 'tampered', $secret) === false, 'Tampered signature rejected');
check(\Utils\JWT::verify(\Utils\JWT::sign(['id' => 'abc123'], $secret, -1), $secret) === false, 'Expired token rejected');
check(\Utils\JWT::verify('invalid', $secret) === false, 'Malformed token rejected');
echo "$checks checks passed\n";
