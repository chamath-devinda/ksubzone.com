<?php
// migrate-to-mysql.php
// Copies all data from the local ksubzone.sqlite database into the MySQL database.
// Supports both cPanel hosting (assigned DB without CREATE DATABASE permission)
// and local dev environments (e.g. XAMPP, Laragon).

ini_set('display_errors', 1);
error_reporting(E_ALL);

// Load env
require_once __DIR__ . '/../utils/Dotenv.php';
\Utils\Dotenv::load(__DIR__ . '/../.env');

$dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'ksubzone';
$host   = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: '127.0.0.1';
$port   = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '3306';
$user   = $_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'root';
$pass   = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: '';

$sqlitePath = __DIR__ . '/../ksubzone.sqlite';
if (!file_exists($sqlitePath)) {
    die("ERROR: SQLite database not found at {$sqlitePath}\n");
}

echo "========================================\n";
echo "KSubZone SQLite -> MySQL Migration Tool\n";
echo "========================================\n";
echo "Connecting to SQLite ({$sqlitePath})...\n";
$sqlite = new \PDO("sqlite:" . $sqlitePath);
$sqlite->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

echo "Connecting to MySQL ({$host}:{$port}, Database: {$dbName})...\n";
$mysql = null;
try {
    // 1. Direct connection to designated DB (cPanel shared hosting mode)
    $mysql = new \PDO("mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4", $user, $pass, [
        \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        \PDO::ATTR_TIMEOUT => 5
    ]);
    echo "Connected successfully to existing database `{$dbName}`.\n";
} catch (\Exception $e) {
    echo "Direct connection notice: " . $e->getMessage() . "\n";
    echo "Attempting to create database if permitted (e.g. local XAMPP)...\n";
    try {
        $mysqlInit = new \PDO("mysql:host={$host};port={$port};charset=utf8mb4", $user, $pass, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_TIMEOUT => 3
        ]);
        $mysqlInit->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $mysql = new \PDO("mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4", $user, $pass, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION
        ]);
        echo "Created and connected to database `{$dbName}`.\n";
    } catch (\Exception $e2) {
        die("FATAL: Could not connect to MySQL: " . $e->getMessage() . "\nMake sure MySQL is running and DB_NAME/DB_USER/DB_PASSWORD in server-php/.env are correct.\n");
    }
}

$tables = [
    'users', 'admins', 'roles', 'permissions', 'movies', 
    'dramas', 'seasons', 'episodes', 'genres', 'subtitles', 
    'reviews', 'comments', 'analytics', 'settings', 'articles',
    'notifications', 'tmdb_imports'
];

$totalMigrated = 0;

foreach ($tables as $table) {
    echo "Checking table: {$table}... ";
    
    // Check if table exists in SQLite
    $checkStmt = $sqlite->query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='{$table}' LIMIT 1");
    if ($checkStmt->fetch() === false) {
        echo "Not present in SQLite (skipped).\n";
        continue;
    }

    // Create MySQL table with proper indexes
    $mysql->exec("CREATE TABLE IF NOT EXISTS `{$table}` (
        `_id` VARCHAR(255) PRIMARY KEY,
        `data` LONGTEXT,
        `createdAt` VARCHAR(50),
        `updatedAt` VARCHAR(50),
        INDEX `idx_{$table}_createdAt` (`createdAt` DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Fetch all rows from SQLite
    $stmt = $sqlite->query("SELECT * FROM `{$table}`");
    $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

    if (count($rows) === 0) {
        echo "0 rows.\n";
        continue;
    }

    $insertStmt = $mysql->prepare("INSERT INTO `{$table}` (`_id`, `data`, `createdAt`, `updatedAt`) 
        VALUES (:id, :data, :created, :updated)
        ON DUPLICATE KEY UPDATE `data` = VALUES(`data`), `updatedAt` = VALUES(`updatedAt`)");

    $count = 0;
    foreach ($rows as $row) {
        try {
            $insertStmt->execute([
                'id' => $row['_id'],
                'data' => $row['data'],
                'created' => $row['createdAt'],
                'updated' => $row['updatedAt']
            ]);
            $count++;
        } catch (\Exception $e) {
            echo "\n  Warning inserting {$row['_id']}: " . $e->getMessage();
        }
    }
    
    $totalMigrated += $count;
    echo "Migrated {$count} rows.\n";
}

echo "========================================\n";
echo "SUCCESS: Migration finished! Total records synced: {$totalMigrated}\n";
echo "You can now set DB_DRIVER=mysql in your .env file.\n";
echo "========================================\n";
