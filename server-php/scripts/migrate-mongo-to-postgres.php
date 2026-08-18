<?php
/**
 * MongoDB to Supabase PostgreSQL Database Migration Script
 * ========================================================
 * Run via PHP CLI: C:\xampp\php\php.exe server-php/scripts/migrate-mongo-to-postgres.php
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);

$serverPhpDir = dirname(__DIR__);

// Register manual class autoloader (zero external dependencies)
spl_autoload_register(function ($class) use ($serverPhpDir) {
    $classPath = str_replace('\\', '/', $class);
    $parts = explode('/', $classPath);
    if (count($parts) > 1) {
        $parts[0] = strtolower($parts[0]);
    }
    $classPath = implode('/', $parts);
    $file = $serverPhpDir . '/' . $classPath . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

require_once $serverPhpDir . '/utils/Dotenv.php';
\Utils\Dotenv::load($serverPhpDir . '/.env');

// Resolve MongoDB & PostgreSQL connection strings
$mongoUri = $_ENV['MONGODB_URI'] ?? getenv('MONGODB_URI') ?: '';
if (empty($mongoUri)) {
    $mongoUri = "mongodb+srv://chamathdewcrypto_db_user:burnitdown@kdramauniverse.2sco96j.mongodb.net/?appName=kdramauniverse";
}

$mongoDbName = 'test'; // Force 'test' database since it contains all user records and drama episodes.
$dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'ksubzone';
$databaseUrl = $_ENV['DATABASE_URL'] ?? getenv('DATABASE_URL') ?: '';

echo "Migration Start Settings:\n";
echo "- MongoDB URI: " . preg_replace('/:(.*)@/', ':******@', $mongoUri) . "\n";
echo "- Source MongoDB DB Name: {$mongoDbName}\n";
echo "- Target Postgres DB Name: {$dbName}\n";
echo "- PostgreSQL URL: " . (empty($databaseUrl) ? "None (using individual env DB_* config)" : preg_replace('/:(.*)@/', ':******@', $databaseUrl)) . "\n\n";

if (!class_exists('MongoDB\Driver\Manager')) {
    echo "ERROR: MongoDB PHP Extension is not installed or enabled in PHP CLI.\n";
    exit(1);
}

// Check database URL config
if (empty($databaseUrl) && empty($_ENV['DB_HOST'])) {
    echo "ERROR: No PostgreSQL connection configuration found. Please configure DATABASE_URL in your .env.\n";
    exit(1);
}

// Recursively clean and serialize MongoDB objects to standard arrays
function cleanMongoDoc($doc) {
    if (!$doc) return null;
    $doc = (array)$doc;
    foreach ($doc as $k => $v) {
        if ($v instanceof \MongoDB\BSON\ObjectId) {
            $doc[$k] = (string)$v;
        } elseif ($v instanceof \MongoDB\BSON\UTCDateTime) {
            $doc[$k] = $v->toDateTime()->format('Y-m-d H:i:s');
        } elseif ($v instanceof \stdClass || is_array($v)) {
            $doc[$k] = cleanMongoDoc($v);
        }
    }
    return $doc;
}

try {
    // 1. Initialize MongoDB connection
    $manager = new MongoDB\Driver\Manager($mongoUri);
    $command = new MongoDB\Driver\Command(['ping' => 1]);
    $manager->executeCommand('admin', $command);
    echo "SUCCESS: Connected to MongoDB Atlas Cloud!\n";

    // 2. Initialize PostgreSQL connection
    if (!empty($databaseUrl)) {
        // Robustly parse DATABASE_URL to handle special characters (like @ or :) in password
        $urlWithoutScheme = str_replace(['postgresql://', 'postgres://'], '', $databaseUrl);
        $lastAtPos = strrpos($urlWithoutScheme, '@');
        
        if ($lastAtPos !== false) {
            $credentials = substr($urlWithoutScheme, 0, $lastAtPos);
            $connection = substr($urlWithoutScheme, $lastAtPos + 1);
            
            $credParts = explode(':', $credentials, 2);
            $user = rawurldecode($credParts[0]);
            $pass = isset($credParts[1]) ? rawurldecode($credParts[1]) : '';
            
            $connParts = explode('/', $connection, 2);
            $hostPort = $connParts[0];
            $dbAndParams = $connParts[1] ?? 'postgres';
            
            $hostParts = explode(':', $hostPort, 2);
            $host = $hostParts[0];
            $port = $hostParts[1] ?? 5432;
            
            $dbParts = explode('?', $dbAndParams, 2);
            $pgDb = $dbParts[0];
        } else {
            // Fallback to standard parse_url if no '@' found
            $parts = parse_url($databaseUrl);
            $host   = $parts['host'] ?? 'localhost';
            $port   = $parts['port'] ?? 5432;
            $pgDb   = ltrim($parts['path'] ?? '/postgres', '/');
            $user   = rawurldecode($parts['user'] ?? 'postgres');
            $pass   = rawurldecode($parts['pass'] ?? '');
        }

        // Auto-translate IPv6 host to IPv4 Session Pooler (port 5432 is open on most firewalls)
        if ($host === 'db.ejvczjiueysbiewzsuin.supabase.co') {
            $host = 'aws-1-ap-south-1.pooler.supabase.com';
            $port = 5432;
            if (strpos($user, 'ejvczjiueysbiewzsuin') === false) {
                $user = $user . '.ejvczjiueysbiewzsuin';
            }
        }

        $dsn = "pgsql:host={$host};port={$port};dbname={$pgDb};sslmode=require";
    } else {
        $host   = $_ENV['DB_HOST'] ?? 'localhost';
        $port   = $_ENV['DB_PORT'] ?? 5432;
        $pgDb   = $_ENV['DB_NAME'] ?? 'postgres';
        $user   = $_ENV['DB_USER'] ?? 'postgres';
        $pass   = $_ENV['DB_PASSWORD'] ?? '';

        // Auto-translate IPv6 host to IPv4 Session Pooler (port 5432 is open on most firewalls)
        if ($host === 'db.ejvczjiueysbiewzsuin.supabase.co') {
            $host = 'aws-1-ap-south-1.pooler.supabase.com';
            $port = 5432;
            if (strpos($user, 'ejvczjiueysbiewzsuin') === false) {
                $user = $user . '.ejvczjiueysbiewzsuin';
            }
        }

        $dsn    = "pgsql:host={$host};port={$port};dbname={$pgDb}";
    }

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 15,
        PDO::ATTR_EMULATE_PREPARES => true
    ]);
    echo "SUCCESS: Connected to Supabase PostgreSQL!\n\n";

    // Collections to migrate
    $collections = [
        'users', 'admins', 'roles', 'permissions', 'movies', 
        'dramas', 'seasons', 'episodes', 'genres', 'subtitles', 
        'reviews', 'comments', 'analytics', 'settings', 'articles',
        'notifications'
    ];

    // Create tables if they do not exist
    echo "Ensuring PostgreSQL tables exist...\n";
    foreach ($collections as $col) {
        $pdo->exec("CREATE TABLE IF NOT EXISTS \"{$col}\" (
            \"_id\" TEXT PRIMARY KEY,
            \"data\" JSONB,
            \"createdAt\" TEXT,
            \"updatedAt\" TEXT
        )");
        $pdo->exec("CREATE INDEX IF NOT EXISTS \"idx_{$col}_createdAt\" ON \"{$col}\" (\"createdAt\" DESC)");
    }
    echo "SUCCESS: Tables and base indexes verified.\n\n";

    foreach ($collections as $col) {
        echo "Processing '{$col}' table...\n";
        
        $query = new \MongoDB\Driver\Query([]);
        try {
            $cursor = $manager->executeQuery("{$mongoDbName}.{$col}", $query);
            $rows = iterator_to_array($cursor);
        } catch (\Exception $e) {
            echo "  - WARNING: Failed to query MongoDB collection '{$col}': " . $e->getMessage() . "\n";
            continue;
        }

        $totalRows = count($rows);
        echo "  - Found {$totalRows} records in MongoDB.\n";

        if ($totalRows === 0) {
            continue;
        }

        $stmt = $pdo->prepare("INSERT INTO \"{$col}\" (\"_id\", \"data\", \"createdAt\", \"updatedAt\") 
            VALUES (:id, :data, :created, :updated) 
            ON CONFLICT (\"_id\") 
            DO UPDATE SET \"data\" = EXCLUDED.\"data\", \"updatedAt\" = EXCLUDED.\"updatedAt\"");

        $migrated = 0;
        foreach ($rows as $row) {
            $data = cleanMongoDoc($row);
            
            $id = $data['_id'];
            $created = $data['createdAt'] ?? date('Y-m-d H:i:s');
            $updated = $data['updatedAt'] ?? date('Y-m-d H:i:s');
            
            unset($data['_id'], $data['createdAt'], $data['updatedAt']);

            $stmt->execute([
                'id' => $id,
                'data' => json_encode($data),
                'created' => $created,
                'updated' => $updated
            ]);
            $migrated++;
        }
        echo "  - SUCCESS: Migrated/Upserted {$migrated} records into PostgreSQL.\n";
    }

    // Now, run ensureIndexesExist to set up functional indexes
    echo "\nCreating functional indexes for PostgreSQL...\n";
    require_once $serverPhpDir . '/config/Database.php';
    
    // Set environment database driver so Database.php runs with it
    $_ENV['DB_DRIVER'] = 'pgsql';
    putenv("DB_DRIVER=pgsql");
    
    $db = \Config\Database::getInstance();
    echo "SUCCESS: Functional indexes created.\n";

    echo "\nSUCCESS: Database migration completed successfully!\n";

} catch (Exception $e) {
    echo "\nFATAL ERROR during migration: " . $e->getMessage() . "\n";
    exit(1);
}
