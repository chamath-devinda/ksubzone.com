<?php
// migrate-to-mysql.php
// Copies all data from the local ksubzone.sqlite database into the local MySQL database.
// This ensures no data is lost when switching DB drivers.

ini_set('display_errors', 1);
error_reporting(E_ALL);

// Load env
require_once __DIR__ . '/../utils/Dotenv.php';
\Utils\Dotenv::load(__DIR__ . '/../.env');

$dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'ksubzone';
$host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: '127.0.0.1';
$port = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '3306';
$user = $_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'root';
$pass = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: '';

$sqlitePath = __DIR__ . '/../ksubzone.sqlite';
if (!file_exists($sqlitePath)) {
    die("ERROR: SQLite database not found at {$sqlitePath}\n");
}

echo "Connecting to SQLite ({$sqlitePath})...\n";
$sqlite = new \PDO("sqlite:" . $sqlitePath);
$sqlite->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

echo "Connecting to MySQL ({$host}:{$port})...\n";
try {
    $mysqlInit = new \PDO("mysql:host={$host};port={$port}", $user, $pass);
    $mysqlInit->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
    $mysqlInit->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    
    $mysql = new \PDO("mysql:host={$host};port={$port};dbname={$dbName}", $user, $pass);
    $mysql->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
    die("ERROR Connecting to MySQL: " . $e->getMessage() . "\nMake sure XAMPP MySQL is running.\n");
}

$tables = [
    'users', 'admins', 'roles', 'permissions', 'movies', 
    'dramas', 'seasons', 'episodes', 'genres', 'subtitles', 
    'reviews', 'comments', 'analytics', 'settings', 'articles'
];

foreach ($tables as $table) {
    echo "Migrating table: {$table}... ";
    
    // Create MySQL table
    $mysql->exec("CREATE TABLE IF NOT EXISTS `{$table}` (
        `_id` VARCHAR(255) PRIMARY KEY,
        `data` LONGTEXT,
        `createdAt` VARCHAR(50),
        `updatedAt` VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Clear existing MySQL data to prevent conflicts
    $mysql->exec("DELETE FROM `{$table}`");

    // Fetch from SQLite
    $stmt = $sqlite->query("SELECT * FROM `{$table}`");
    $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

    if (count($rows) === 0) {
        echo "0 rows.\n";
        continue;
    }

    $insertStmt = $mysql->prepare("INSERT INTO `{$table}` (_id, data, createdAt, updatedAt) VALUES (:id, :data, :created, :updated)");

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
        } catch (Exception $e) {
            echo "\n  Warning: Failed to insert row {$row['_id']} - " . $e->getMessage();
        }
    }
    
    echo "Migrated {$count} rows.\n";
}

echo "Migration to MySQL completed successfully!\n";
