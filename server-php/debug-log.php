<?php
// Standalone diagnostic script for KSubZone
header('Content-Type: text/plain; charset=utf-8');

echo "=== KSUBZONE DIAGNOSTIC SCRIPT ===\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "OS: " . PHP_OS . "\n";
echo "Doc Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'unknown') . "\n";
echo "Request URI: " . ($_SERVER['REQUEST_URI'] ?? 'unknown') . "\n";
echo "\n";

// 1. Directory Listing
echo "=== DIRECTORY LISTING OF CURRENT FOLDER & SUBDIRS ===\n";
function listDirContents($dir, $prefix = '') {
    if (is_dir($dir)) {
        $files = scandir($dir);
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            $path = $dir . '/' . $file;
            $perms = substr(sprintf('%o', fileperms($path)), -4);
            $size = is_file($path) ? filesize($path) . " bytes" : "[DIR]";
            $owner = function_exists('posix_getpwuid') ? posix_getpwuid(fileowner($path))['name'] : fileowner($path);
            $mtime = date('Y-m-d H:i:s', filemtime($path));
            
            echo "{$prefix}{$file} | Perms: {$perms} | Size: {$size} | Modified: {$mtime} | Owner: {$owner}\n";
            
            if (is_dir($path) && ($file === 'controllers' || $file === 'utils' || $file === 'config')) {
                listDirContents($path, $prefix . "  -> ");
            }
        }
    } else {
        echo "Directory not readable: {$dir}\n";
    }
}
$dir = dirname(__FILE__);
listDirContents($dir);
echo "\n";

// 2. Read Env File
echo "=== .env FILE CHECK ===\n";
$envPath = $dir . '/.env';
if (file_exists($envPath)) {
    echo ".env file exists.\n";
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (empty(trim($line)) || strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $k = trim($parts[0]);
            $v = trim($parts[1]);
            // Mask password in database URL
            if ($k === 'DATABASE_URL') {
                $v = preg_replace('/:(.*)@/', ':******@', $v);
            }
            echo "{$k} = {$v}\n";
        }
    }
} else {
    echo ".env file does not exist in: {$envPath}\n";
}
echo "\n";

// 3. Read PHP Error Log
echo "=== SERVER ERROR LOGS ===\n";
$logPaths = [
    $dir . '/error_log',
    dirname($dir) . '/error_log',
    $dir . '/import_error.log',
];
$foundLog = false;
foreach ($logPaths as $path) {
    if (file_exists($path)) {
        echo "Found log at: {$path}\n";
        $lines = file($path);
        $lastLines = array_slice($lines, -100);
        echo implode("", $lastLines);
        echo "\n";
        $foundLog = true;
    }
}
if (!$foundLog) {
    echo "No error_log file found in standard locations.\n";
}
echo "\n";

// 4. Test Database Connection
echo "=== DATABASE CONNECTION TEST ===\n";
// Manually load env values to avoid side-effects
$dbDriver = '';
$dbUrl = '';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $k = trim($parts[0]);
            $v = trim($parts[1]);
            if (strlen($v) >= 2) {
                $first = $v[0];
                $last = $v[strlen($v) - 1];
                if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                    $v = substr($v, 1, -1);
                }
            }
            if ($k === 'DB_DRIVER') $dbDriver = $v;
            if ($k === 'DATABASE_URL') $dbUrl = $v;
        }
    }
}

if ($dbDriver === 'pgsql' || (!empty($dbUrl) && strpos($dbUrl, 'postgresql') === 0)) {
    echo "Testing PostgreSQL connection...\n";
    try {
        $urlWithoutScheme = str_replace(['postgresql://', 'postgres://'], '', $dbUrl);
        $lastAtPos = strrpos($urlWithoutScheme, '@');
        if ($lastAtPos !== false) {
            $credentials = substr($urlWithoutScheme, 0, $lastAtPos);
            $connection = substr($urlWithoutScheme, $lastAtPos + 1);
            $credParts = explode(':', $credentials, 2);
            $user = rawurldecode($credParts[0]);
            $pass = isset($credParts[1]) ? rawurldecode($credParts[1]) : '';
            $connParts = explode('/', $connection, 2);
            $hostPort = $connParts[0];
            $dbName = explode('?', $connParts[1] ?? 'postgres')[0];
            $hostParts = explode(':', $hostPort, 2);
            $host = $hostParts[0];
            $port = $hostParts[1] ?? 5432;
        } else {
            $parts = parse_url($dbUrl);
            $host   = $parts['host'] ?? 'localhost';
            $port   = $parts['port'] ?? 5432;
            $dbName = ltrim($parts['path'] ?? '/postgres', '/');
            $user   = rawurldecode($parts['user'] ?? 'postgres');
            $pass   = rawurldecode($parts['pass'] ?? '');
        }

        // Apply pooler rules
        $poolerHost = $host;
        $poolerUser = $user;
        if ($host === 'db.ejvczjiueysbiewzsuin.supabase.co') {
            echo "Translating Supabase direct IPv6 host to IPv4 session pooler...\n";
            $poolerHost = 'aws-1-ap-south-1.pooler.supabase.com';
            if (strpos($user, 'ejvczjiueysbiewzsuin') === false) {
                $poolerUser = $user . '.ejvczjiueysbiewzsuin';
            }
        }

        $testPorts = [5432, 6543];
        foreach ($testPorts as $testPort) {
            echo "\n--- Testing port {$testPort} ---\n";
            echo "Connecting to Host: {$poolerHost}, Port: {$testPort}, Database: {$dbName}, User: {$poolerUser} (Timeout: 3s)\n";
            try {
                $dsn = "pgsql:host={$poolerHost};port={$testPort};dbname={$dbName};sslmode=require";
                $t1 = microtime(true);
                $pdo = new \PDO($dsn, $poolerUser, $pass, [
                    \PDO::ATTR_TIMEOUT => 3,
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION
                ]);
                $t2 = microtime(true);
                echo "SUCCESS: Connected on port {$testPort} in " . round($t2 - $t1, 4) . " seconds!\n";
                
                // Run simple query
                $stmt = $pdo->query("SELECT COUNT(*) FROM movies");
                $count = $stmt->fetchColumn();
                echo "Verification Query: Found {$count} movies in database.\n";
            } catch (\Exception $e) {
                echo "FAILED to connect on port {$testPort}: " . $e->getMessage() . "\n";
            }
        }
    } catch (\Exception $e) {
        echo "FAILED during setup: " . $e->getMessage() . "\n";
    }
} else {
    echo "DB Driver is not pgsql (Driver: {$dbDriver}). Skipping pgsql test.\n";
}

echo "\n=== END OF DIAGNOSTICS ===\n";
