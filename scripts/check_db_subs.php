<?php
require_once __DIR__ . '/../server-php/config/Database.php';

// Load .env if not loaded
if (file_exists(__DIR__ . '/../server-php/.env')) {
    $lines = file(__DIR__ . '/../server-php/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = array_pad(explode('=', $line, 2), 2, null);
        if ($name !== null && !getenv($name)) {
            putenv(trim($name) . '=' . trim($value));
        }
    }
}

$db = \Config\Database::getInstance();

$drama = $db->findOne('dramas', ['slug' => 'the-affair-was-just-the-beginning']);
if (!$drama) {
    $dramas = $db->find('dramas', []);
    foreach ($dramas as $d) {
        if (stripos($d['title'] ?? '', 'The Affair Was Just') !== false) {
            $drama = $d;
            break;
        }
    }
}

if (!$drama) {
    echo "Drama not found in DB\n";
    exit;
}

echo "Found drama ID: {$drama['_id']}\n";
echo "Title: {$drama['title']}\n";

$seasons = $db->find('seasons', ['dramaId' => $drama['_id']]);
echo "Seasons in DB: " . count($seasons) . "\n";

$episodes = $db->find('episodes', ['dramaId' => $drama['_id']]);
echo "Episodes in DB: " . count($episodes) . "\n";

$epIds = [];
foreach ($episodes as $e) {
    $epIds[] = (string)$e['_id'];
    echo "  Ep {$e['episodeNumber']} (Season {$e['seasonId']}): ID={$e['_id']}\n";
}

$allSubs = $db->find('subtitles', []);
echo "Total subtitles in entire DB: " . count($allSubs) . "\n";

$matchingSubs = [];
foreach ($allSubs as $s) {
    $mId = (string)($s['mediaId'] ?? '');
    $dId = (string)($s['dramaId'] ?? '');
    $label = (string)($s['label'] ?? '');
    if ($mId === (string)$drama['_id'] || in_array($mId, $epIds) || $dId === (string)$drama['_id'] || stripos($label, 'The Affair') !== false) {
        $matchingSubs[] = $s;
    }
}

echo "Matching subtitles: " . count($matchingSubs) . "\n";
foreach ($matchingSubs as $ms) {
    $epNum = $ms['episodeNumber'] ?? 'N/A';
    $status = $ms['approvalStatus'] ?? 'N/A';
    $mediaId = $ms['mediaId'] ?? 'N/A';
    $label = $ms['label'] ?? 'N/A';
    $seasonNum = $ms['seasonNumber'] ?? 'N/A';
    echo "  ID: {$ms['_id']} | epNum: {$epNum} | S: {$seasonNum} | approval: {$status} | mediaId: {$mediaId} | label: {$label}\n";
}
