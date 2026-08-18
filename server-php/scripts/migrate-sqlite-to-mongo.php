<?php
/**
 * SQLite to MongoDB Atlas Database Migration Script
 * ========================================================
 * Run via PHP CLI: C:\xampp\php\php.exe server-php/scripts/migrate-sqlite-to-mongo.php
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);

$serverPhpDir = dirname(__DIR__);
require_once $serverPhpDir . '/utils/Dotenv.php';
\Utils\Dotenv::load($serverPhpDir . '/.env');

// Resolve MongoDB Connection String (check .env first, fallback to verified string)
$mongoUri = $_ENV['MONGODB_URI'] ?? getenv('MONGODB_URI') ?: '';
if (empty($mongoUri) || strpos($mongoUri, '<username>') !== false) {
    // Fallback to the verified working connection string
    $mongoUri = "mongodb+srv://chamathdewcrypto_db_user:burnitdown@kdramauniverse.2sco96j.mongodb.net/?appName=kdramauniverse";
}

$dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'ksubzone';
$sqlitePath = $serverPhpDir . '/ksubzone.sqlite';

echo "Migration Start Settings:\n";
echo "- SQLite Path: {$sqlitePath}\n";
echo "- MongoDB URI: " . preg_replace('/:(.*)@/', ':******@', $mongoUri) . "\n";
echo "- Target DB: {$dbName}\n\n";

if (!file_exists($sqlitePath)) {
    echo "ERROR: SQLite database file not found at {$sqlitePath}\n";
    exit(1);
}

if (!class_exists('MongoDB\Driver\Manager')) {
    echo "ERROR: MongoDB PHP Extension is not installed or enabled in PHP CLI.\n";
    exit(1);
}

try {
    // 1. Initialize DB connections
    $sqlite = new PDO("sqlite:" . $sqlitePath);
    $sqlite->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $manager = new MongoDB\Driver\Manager($mongoUri);
    // Ping to verify connection
    $command = new MongoDB\Driver\Command(['ping' => 1]);
    $manager->executeCommand('admin', $command);
    echo "SUCCESS: Connected to MongoDB Atlas Cloud!\n\n";

    $collections = [
        'users', 'admins', 'roles', 'permissions', 'movies', 
        'dramas', 'seasons', 'episodes', 'genres', 'subtitles', 
        'reviews', 'comments', 'analytics', 'settings', 'articles',
        'notifications', 'reports', 'homepagesections', 'rolepermissions'
    ];

    foreach ($collections as $col) {
        // Check if SQLite table exists
        try {
            $tableCheck = $sqlite->query("SELECT 1 FROM `{$col}` LIMIT 1");
        } catch (PDOException $e) {
            echo "Skipping table '{$col}' (does not exist in SQLite)\n";
            continue;
        }

        // Query all rows from SQLite
        $rows = $sqlite->query("SELECT * FROM `{$col}`")->fetchAll(PDO::FETCH_ASSOC);
        $totalRows = count($rows);
        echo "Processing '{$col}' table ({$totalRows} records)...\n";

        if ($totalRows === 0) {
            continue;
        }

        $bulk = new \MongoDB\Driver\BulkWrite();
        $operationsCount = 0;

        foreach ($rows as $row) {
            $data = json_decode($row['data'], true) ?: [];
            
            // Reconstruct the _id correctly (convert to ObjectId if it matches 24-char hex format)
            $id = $row['_id'];
            $idObj = preg_match('/^[a-f0-9]{24}$/i', $id) ? new \MongoDB\BSON\ObjectId($id) : $id;
            
            $doc = array_merge([
                '_id' => $idObj,
                'createdAt' => $row['createdAt'],
                'updatedAt' => $row['updatedAt']
            ], $data);

            // Upsert in MongoDB
            $bulk->update(['_id' => $idObj], ['$set' => $doc], ['upsert' => true]);
            $operationsCount++;
        }

        if ($operationsCount > 0) {
            $result = $manager->executeBulkWrite("{$dbName}.{$col}", $bulk);
            echo "  - Migrated/Upserted: {$operationsCount} records (Inserted: " . $result->getUpsertedCount() . ", Modified: " . $result->getModifiedCount() . ")\n";
        }
    }

    echo "\nSUCCESS: Database migration completed successfully!\n";

} catch (Exception $e) {
    echo "\nFATAL ERROR during migration: " . $e->getMessage() . "\n";
    exit(1);
}
