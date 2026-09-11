<?php
require_once __DIR__ . '/../server-php/config/Database.php';
require_once __DIR__ . '/../server-php/utils/JWT.php';

// Load .env
$envPath = file_exists(__DIR__ . '/../server-php/.env') ? __DIR__ . '/../server-php/.env' : (file_exists(__DIR__ . '/../.env') ? __DIR__ . '/../.env' : null);
if ($envPath) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = array_pad(explode('=', $line, 2), 2, null);
        if ($name !== null && !getenv($name)) {
            putenv(trim($name) . '=' . trim($value));
            $_ENV[trim($name)] = trim($value);
        }
    }
}

$db = \Config\Database::getInstance();
$admin = $db->findOne('admins', []);
if (!$admin) {
    echo "No admin user found\n";
    exit;
}

echo "Admin found: " . $admin['username'] . " (id: " . $admin['_id'] . ")\n";

$secret = \Utils\JWT::secret();
$token = \Utils\JWT::sign([
    'id' => (string)$admin['_id'],
    'role' => 'admin'
], $secret, 1);

echo "Generated token: " . substr($token, 0, 20) . "...\n";

// Call clear cache on live backend
$url = 'https://api.ksubzone.com/api/admin/clear-cache';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $token
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Curl Error: $curlError\n";
echo "Response: $response\n";
