<?php
// PHP KSubZone Background Import Runner
// =====================================

// Disable time limits
@set_time_limit(0);
ini_set('max_execution_time', 0);

// Autoloader setup
spl_autoload_register(function ($class) {
    $classPath = str_replace('\\', '/', $class);
    $parts = explode('/', $classPath);
    if (count($parts) > 1) {
        $parts[0] = strtolower($parts[0]);
    }
    $classPath = implode('/', $parts);
    $file = dirname(__DIR__) . '/' . $classPath . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

// Load environment variables
use Utils\Dotenv;
Dotenv::load(dirname(__DIR__) . '/.env');

// Decode CLI arguments
$argsInput = $argv[1] ?? '{}';
if (!empty($argsInput) && $argsInput[0] !== '{' && $argsInput[0] !== '[') {
    $argsJson = base64_decode($argsInput) ?: '{}';
} else {
    $argsJson = $argsInput;
}
$params = json_decode($argsJson, true) ?: [];

$action = $params['action'] ?? '';
$id = $params['id'] ?? null;
$ids = $params['ids'] ?? [];
$type = $params['type'] ?? 'movie';
$isHistorical = (bool)($params['isHistorical'] ?? false);

try {
    if ($action === 'import' && $id) {
        echo "Starting background import for TMDB ID: {$id} ({$type})\n";
        \Controllers\TmdbController::runBackgroundImport($id, $type, $isHistorical);
        echo "Background import completed successfully.\n";
    } elseif ($action === 'bulk-import' && !empty($ids)) {
        echo "Starting background bulk import for " . count($ids) . " titles...\n";
        foreach ($ids as $titleId) {
            try {
                \Controllers\TmdbController::runBackgroundImport($titleId, $type, $isHistorical);
                echo "Successfully imported ID: {$titleId}\n";
            } catch (\Exception $e) {
                echo "Failed to import ID {$titleId}: " . $e->getMessage() . "\n";
                error_log("Bulk Import ID {$titleId} Error: " . $e->getMessage());
            }
        }
        echo "Background bulk import completed.\n";
    } else {
        echo "Invalid parameters or no action specified.\n";
    }
} catch (\Exception $e) {
    error_log("Background Import CLI Exception: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
