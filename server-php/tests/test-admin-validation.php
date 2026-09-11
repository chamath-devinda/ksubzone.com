<?php
require_once __DIR__ . '/../utils/AdminValidation.php';

$validPayload = [
    'title' => 'The Ordinary Jackpot (2026) Sinhala Subtitles | සිංහල උපසිරැසි',
    'description' => "An ordinary office worker wins the lottery.",
    'runtime' => 60,
    'tmdbRating' => 8.0,
    'imdbRating' => 8.0,
    'status' => 'Upcoming',
    'poster' => 'https://image.tmdb.org/t/p/w500/test.jpg',
    'banner' => 'https://image.tmdb.org/t/p/original/test.jpg'
];

$errors = \Utils\AdminValidation::content($validPayload);
if (!empty($errors)) {
    echo "FAILED: Valid payload had errors: " . json_encode($errors) . "\n";
    exit(1);
}

// Test boundary violations
$invalidPayload = [
    'runtime' => -5,
    'tmdbRating' => 15,
    'poster' => 'javascript:alert(1)',
    'status' => 'InvalidStatus'
];
$errors = \Utils\AdminValidation::content($invalidPayload);
assert(isset($errors['runtime']), 'Runtime below 0 should fail');
assert(isset($errors['tmdbRating']), 'Rating above 10 should fail');
assert(isset($errors['poster']), 'Invalid URL scheme should fail');
assert(isset($errors['status']), 'Invalid status should fail');

echo "PASS: AdminValidation unit tests passed successfully.\n";
