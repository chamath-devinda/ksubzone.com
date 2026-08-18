<?php
header('Content-Type: text/plain');
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Register autoloader
spl_autoload_register(function ($class) {
    $classPath = str_replace('\\', '/', $class);
    $parts = explode('/', $classPath);
    if (count($parts) > 1) {
        $parts[0] = strtolower($parts[0]);
    }
    $classPath = implode('/', $parts);
    $file = __DIR__ . '/' . $classPath . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

// Load environment variables
use Utils\Dotenv;
Dotenv::load(__DIR__ . '/.env');

try {
    $db = \Config\Database::getInstance();
    echo "Driver: " . $db->getDriver() . "\n";
    echo "Fallback Warning: " . ($db->getFallbackWarning() ?: "None") . "\n\n";
    
    $dramas = $db->find('dramas');
    echo "Dramas count: " . count($dramas) . "\n";
    foreach ($dramas as $d) {
        echo "- Drama: " . ($d['title'] ?? 'Unknown') . " (ID: " . $d['_id'] . ", TMDB: " . ($d['tmdbId'] ?? 'N/A') . ")\n";
    }
    
    $seasons = $db->find('seasons');
    echo "\nSeasons count: " . count($seasons) . "\n";
    foreach ($seasons as $s) {
        echo "- Season: ID=" . $s['_id'] . ", dramaId=" . ($s['dramaId'] ?? 'N/A') . ", Num=" . ($s['seasonNumber'] ?? 'N/A') . "\n";
    }
    
    $episodes = $db->find('episodes');
    echo "\nEpisodes count: " . count($episodes) . "\n";
    
    // Test the exact lookup query for Doctor on the Edge (ID: 3efb10f85cde46b0c827eeb3 or similar)
    $doctorDrama = \Utils\Slug::findByPermalinkSlug($db, 'dramas', 'doctor-on-the-edge');
    if ($doctorDrama) {
        echo "\n=== Doctor on the Edge (ID: " . $doctorDrama['_id'] . ") ===\n";
        
        $docSeasons = $db->find('seasons', ['dramaId' => $doctorDrama['_id']]);
        echo "Query Seasons count: " . count($docSeasons) . "\n";
        foreach ($docSeasons as $s) {
            echo "  - Season ID: " . $s['_id'] . ", Number: " . $s['seasonNumber'] . "\n";
        }
        
        $docEpisodes = $db->find('episodes', ['dramaId' => $doctorDrama['_id']]);
        echo "Query Episodes count: " . count($docEpisodes) . "\n";
    } else {
        echo "\nDoctor on the Edge not found by slug.\n";
    }
    
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
}
