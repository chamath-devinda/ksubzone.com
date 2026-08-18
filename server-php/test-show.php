<?php
$apiKey = getenv('TMDB_API_KEY') ?: '';
if ($apiKey === '') {
    fwrite(STDERR, "TMDB_API_KEY is required.\n");
    exit(1);
}
$url = "https://api.themoviedb.org/3/tv/287009?api_key={$apiKey}";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
curl_close($ch);
$data = json_decode($response, true);
echo "Show Name: " . ($data['name'] ?? 'Not Found') . "\n";
if (isset($data['seasons'])) {
    foreach ($data['seasons'] as $s) {
        echo "- Season " . ($s['season_number'] ?? 'N/A') . ": " . ($s['episode_count'] ?? 0) . " episodes\n";
    }
}


