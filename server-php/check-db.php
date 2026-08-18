<?php
$sqlitePath = __DIR__ . '/ksubzone.sqlite';
$sqlite = new PDO("sqlite:" . $sqlitePath);
$dramas = $sqlite->query("SELECT data FROM dramas")->fetchAll(PDO::FETCH_ASSOC);
echo "Dramas in SQLite:\n";
foreach ($dramas as $row) {
    $data = json_decode($row['data'], true);
    echo "- " . ($data['title'] ?? 'Unknown') . "\n";
}
$movies = $sqlite->query("SELECT data FROM movies")->fetchAll(PDO::FETCH_ASSOC);
echo "Movies in SQLite:\n";
foreach ($movies as $row) {
    $data = json_decode($row['data'], true);
    echo "- " . ($data['title'] ?? 'Unknown') . "\n";
}
