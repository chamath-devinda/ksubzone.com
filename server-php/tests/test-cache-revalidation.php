<?php

require_once __DIR__ . '/../utils/Cache.php';
require_once __DIR__ . '/../utils/Revalidate.php';

$passed = 0;
$failed = 0;

function checkResult($condition, $message) {
    global $passed, $failed;
    if ($condition) {
        echo "PASS: {$message}\n";
        $passed++;
    } else {
        echo "FAIL: {$message}\n";
        $failed++;
    }
}

$unique = 'test_' . str_replace('.', '_', uniqid('', true));
$targetPrefix = $unique . '_target_';
$targetKey = $targetPrefix . 'one';
$controlKey = $unique . '_control_one';

\Utils\Cache::set($targetKey, ['fresh' => false], 60);
\Utils\Cache::set($controlKey, ['fresh' => true], 60);
\Utils\Cache::deleteByPrefix($targetPrefix);

checkResult(\Utils\Cache::get($targetKey) === false, 'Prefix invalidation removes matching cache entries');
checkResult(\Utils\Cache::get($controlKey) !== false, 'Prefix invalidation preserves unrelated cache entries');
\Utils\Cache::delete($controlKey);

$_ENV['NEXT_JS_URL'] = 'https://www.ksubzone.com';
$_ENV['REVALIDATION_TOKEN'] = 'test-token';
\Utils\Revalidate::path('/drama/one', ['drama-one', 'dramas']);
\Utils\Revalidate::path('/dramas', ['dramas']);

$reflection = new ReflectionClass('Utils\\Revalidate');
$pendingProperty = $reflection->getProperty('pending');
$pendingProperty->setAccessible(true);
$pending = array_values($pendingProperty->getValue());

checkResult(count($pending) === 1, 'Revalidation paths are batched into one remote request');
checkResult(isset($pending[0]['paths']['/drama/one']) && isset($pending[0]['paths']['/dramas']), 'Batched revalidation retains every path');
checkResult(isset($pending[0]['tags']['drama-one']) && isset($pending[0]['tags']['dramas']), 'Batched revalidation deduplicates and retains tags');

// Prevent the registered shutdown callback from making a network request in tests.
$pendingProperty->setValue([]);

echo "{$passed} checks passed, {$failed} failed\n";
exit($failed > 0 ? 1 : 0);
