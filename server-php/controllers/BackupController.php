<?php
namespace Controllers;

use Config\Database;
use Middleware\AuthMiddleware;
use Utils\GoogleDrive;

class BackupController {
    private static function getConfigPath() {
        return dirname(__DIR__) . '/config/backup_config.json';
    }

    private static function loadConfig() {
        $path = self::getConfigPath();
        if (file_exists($path)) {
            $data = json_decode(file_get_contents($path), true);
            if (is_array($data)) {
                return $data;
            }
        }
        return [
            'serviceAccount' => null,
            'folderId' => '1-mG-eq1GNxQrI9Byj23RC-JFOO_3Z57n',
            'lastBackupTime' => null
        ];
    }

    private static function saveConfig($config) {
        $path = self::getConfigPath();
        $configDir = dirname($path);
        if (!file_exists($configDir)) {
            @mkdir($configDir, 0777, true);
        }
        file_put_contents($path, json_encode($config, JSON_PRETTY_PRINT));
    }

    public static function getSettings() {
        $config = self::loadConfig();
        $isConfigured = !empty($config['serviceAccount']);
        
        $clientEmail = '';
        if ($isConfigured && is_array($config['serviceAccount'])) {
            $clientEmail = $config['serviceAccount']['client_email'] ?? '';
        }

        header('Content-Type: application/json');
        echo json_encode([
            'folderId' => $config['folderId'] ?? '1-mG-eq1GNxQrI9Byj23RC-JFOO_3Z57n',
            'serviceAccountConfigured' => $isConfigured,
            'serviceAccountEmail' => $clientEmail,
            'lastBackupTime' => $config['lastBackupTime'] ?? null
        ]);
    }

    public static function saveSettings() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $serviceAccountStr = $body['serviceAccount'] ?? '';
        $folderId = $body['folderId'] ?? '1-mG-eq1GNxQrI9Byj23RC-JFOO_3Z57n';

        if (empty($folderId)) {
            http_response_code(400);
            echo json_encode(['message' => 'Folder ID is required.']);
            return;
        }

        $serviceAccount = null;
        if (!empty($serviceAccountStr)) {
            $serviceAccount = json_decode($serviceAccountStr, true);
            if (empty($serviceAccount) || !is_array($serviceAccount) || !isset($serviceAccount['private_key']) || !isset($serviceAccount['client_email'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid Google Service Account JSON configuration format.']);
                return;
            }
        }

        $config = self::loadConfig();
        $config['serviceAccount'] = $serviceAccount;
        $config['folderId'] = $folderId;

        self::saveConfig($config);

        header('Content-Type: application/json');
        echo json_encode([
            'message' => 'Backup settings saved successfully.',
            'serviceAccountConfigured' => !empty($serviceAccount),
            'serviceAccountEmail' => $serviceAccount['client_email'] ?? ''
        ]);
    }

    public static function listBackups() {
        $config = self::loadConfig();
        if (empty($config['serviceAccount'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Google Service Account is not configured.']);
            return;
        }

        try {
            $drive = new GoogleDrive($config['serviceAccount'], $config['folderId']);
            $files = $drive->listBackups();
            header('Content-Type: application/json');
            echo json_encode($files);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Google Drive error: ' . $e->getMessage()]);
        }
    }

    public static function createBackup() {
        $config = self::loadConfig();
        $uploadToDrive = isset($_GET['drive']) && $_GET['drive'] === 'true';

        if ($uploadToDrive && empty($config['serviceAccount'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Google Service Account is not configured.']);
            return;
        }

        $tempZip = tempnam(sys_get_temp_dir(), 'backup_') . '.zip';

        try {
            self::generateZipArchive($tempZip);

            if ($uploadToDrive) {
                $drive = new GoogleDrive($config['serviceAccount'], $config['folderId']);
                $fileName = 'ksubzone_backup_' . date('Y-m-d_H-i-s') . '.zip';
                $drive->uploadBackup($tempZip, $fileName);
                
                // Update last backup time
                $config['lastBackupTime'] = date('Y-m-d H:i:s');
                self::saveConfig($config);

                @unlink($tempZip);
                header('Content-Type: application/json');
                echo json_encode(['message' => 'Backup uploaded to Google Drive successfully.', 'filename' => $fileName]);
            } else {
                // Download directly to local machine
                if (file_exists($tempZip)) {
                    header('Content-Description: File Transfer');
                    header('Content-Type: application/zip');
                    header('Content-Disposition: attachment; filename="ksubzone_backup_' . date('Y-m-d_H-i-s') . '.zip"');
                    header('Expires: 0');
                    header('Cache-Control: must-revalidate');
                    header('Pragma: public');
                    header('Content-Length: ' . filesize($tempZip));
                    readfile($tempZip);
                    @unlink($tempZip);
                    exit;
                } else {
                    throw new \Exception("Zipped archive generation failed.");
                }
            }
        } catch (\Exception $e) {
            if (file_exists($tempZip)) {
                @unlink($tempZip);
            }
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Backup creation failed: ' . $e->getMessage()]);
        }
    }

    public static function restoreBackup() {
        $config = self::loadConfig();
        $fileId = $_POST['fileId'] ?? '';
        $isManual = isset($_FILES['backup']);

        $tempZip = tempnam(sys_get_temp_dir(), 'restore_') . '.zip';

        try {
            if ($isManual) {
                $file = $_FILES['backup'];
                if ($file['error'] !== UPLOAD_ERR_OK) {
                    throw new \Exception("File upload failed with error code: " . $file['error']);
                }
                if (!move_uploaded_file($file['tmp_name'], $tempZip)) {
                    throw new \Exception("Failed to move uploaded backup zip into server temp directory.");
                }
            } else {
                if (empty($fileId)) {
                    throw new \Exception("Google Drive File ID or manual upload zip is required.");
                }
                if (empty($config['serviceAccount'])) {
                    throw new \Exception("Google Service Account is not configured.");
                }
                $drive = new GoogleDrive($config['serviceAccount'], $config['folderId']);
                $drive->downloadBackup($fileId, $tempZip);
            }

            // Restore from ZIP
            self::restoreFromZip($tempZip);
            @unlink($tempZip);

            header('Content-Type: application/json');
            echo json_encode(['message' => 'Database records and local media files restored successfully.']);
        } catch (\Exception $e) {
            if (file_exists($tempZip)) {
                @unlink($tempZip);
            }
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Restoration failed: ' . $e->getMessage()]);
        }
    }

    public static function deleteBackup($id) {
        $config = self::loadConfig();
        if (empty($config['serviceAccount'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Google Service Account is not configured.']);
            return;
        }

        try {
            $drive = new GoogleDrive($config['serviceAccount'], $config['folderId']);
            $drive->deleteBackup($id);
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Backup file deleted successfully.']);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['message' => 'Google Drive error: ' . $e->getMessage()]);
        }
    }

    // --- Core Zip/Zip extraction helpers ---

    private static function generateZipArchive($zipPath) {
        $zip = new \ZipArchive();
        if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== TRUE) {
            throw new \Exception("Failed to initiate zip system.");
        }

        // Add active SQLite database file
        $dbPath = dirname(dirname(__FILE__)) . '/ksubzone.sqlite';
        if (file_exists($dbPath)) {
            $tempDbCopy = tempnam(sys_get_temp_dir(), 'db_copy_');
            if (copy($dbPath, $tempDbCopy)) {
                $zip->addFile($tempDbCopy, 'ksubzone.sqlite');
            } else {
                $zip->addFile($dbPath, 'ksubzone.sqlite');
            }
        }

        // Add local uploads recursively
        $uploadsDir = dirname(dirname(__FILE__)) . '/uploads';
        if (is_dir($uploadsDir)) {
            $files = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($uploadsDir),
                \RecursiveIteratorIterator::LEAVES_ONLY
            );

            foreach ($files as $name => $file) {
                if (!$file->isDir()) {
                    $filePath = $file->getRealPath();
                    $relativePath = 'uploads/' . substr($filePath, strlen($uploadsDir) + 1);
                    $zip->addFile($filePath, $relativePath);
                }
            }
        }

        // Add Database collections as JSON exports for safety/cross-compatibility
        $db = Database::getInstance();
        $collections = [
            'users', 'admins', 'roles', 'permissions', 'movies', 
            'dramas', 'seasons', 'episodes', 'genres', 'subtitles', 
            'reviews', 'comments', 'analytics', 'settings', 'articles',
            'notifications'
        ];

        foreach ($collections as $col) {
            try {
                $docs = $db->find($col);
                if (!empty($docs)) {
                    $zip->addFromString('json_export/' . $col . '.json', json_encode($docs, JSON_PRETTY_PRINT));
                }
            } catch (\Exception $e) {
                // Keep moving
            }
        }

        $zip->close();

        if (isset($tempDbCopy) && file_exists($tempDbCopy)) {
            @unlink($tempDbCopy);
        }
    }

    private static function restoreFromZip($zipPath) {
        $zip = new \ZipArchive();
        if ($zip->open($zipPath) !== TRUE) {
            throw new \Exception("Uploaded file is not a valid zip file.");
        }

        $tempExtractDir = sys_get_temp_dir() . '/ksubzone_restore_' . uniqid();
        if (!@mkdir($tempExtractDir, 0777, true)) {
            throw new \Exception("Failed to construct local temporary directory for zip extraction.");
        }

        if (!$zip->extractTo($tempExtractDir)) {
            self::deleteDirectory($tempExtractDir);
            $zip->close();
            throw new \Exception("Failed to extract files from ZIP package.");
        }
        $zip->close();

        // 1. Sync local uploads folder if present in backup
        $extractedUploads = $tempExtractDir . '/uploads';
        if (is_dir($extractedUploads)) {
            $targetUploads = dirname(dirname(__FILE__)) . '/uploads';
            self::copyDirectory($extractedUploads, $targetUploads);
        }

        // 2. Sync database rows (supports SQLite/MySQL/MongoDB)
        $extractedSqlite = $tempExtractDir . '/ksubzone.sqlite';
        $db = Database::getInstance();
        
        $collections = [
            'users', 'admins', 'roles', 'permissions', 'movies', 
            'dramas', 'seasons', 'episodes', 'genres', 'subtitles', 
            'reviews', 'comments', 'analytics', 'settings', 'articles',
            'notifications'
        ];

        if ($db->getDriver() === 'sqlite' && file_exists($extractedSqlite)) {
            // Restore by copy SQL statements directly from temp SQLite
            $tempPdo = new \PDO("sqlite:" . $extractedSqlite);
            $tempPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            $tempPdo->setAttribute(\PDO::ATTR_DEFAULT_FETCH_MODE, \PDO::FETCH_ASSOC);

            foreach ($collections as $col) {
                // Ensure table exists in temp sqlite
                $checkTable = $tempPdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='{$col}'");
                if ($checkTable->fetch()) {
                    $rows = $tempPdo->query("SELECT * FROM `{$col}`")->fetchAll();
                    $db->deleteMany($col, []);
                    
                    foreach ($rows as $row) {
                        if (isset($row['data'])) {
                            $data = json_decode($row['data'], true) ?: [];
                            $data['_id'] = $row['_id'];
                            $data['createdAt'] = $row['createdAt'];
                            $data['updatedAt'] = $row['updatedAt'];
                            $db->insertOne($col, $data);
                        }
                    }
                }
            }
        } else {
            // Restore from JSON exports directory
            $jsonExportDir = $tempExtractDir . '/json_export';
            if (is_dir($jsonExportDir)) {
                foreach ($collections as $col) {
                    $jsonFile = $jsonExportDir . '/' . $col . '.json';
                    if (file_exists($jsonFile)) {
                        $docs = json_decode(file_get_contents($jsonFile), true);
                        if (is_array($docs)) {
                            $db->deleteMany($col, []);
                            foreach ($docs as $doc) {
                                $db->insertOne($col, $doc);
                            }
                        }
                    }
                }
            } else {
                self::deleteDirectory($tempExtractDir);
                throw new \Exception("Backup archive lacks database records file (ksubzone.sqlite or json_export).");
            }
        }

        self::deleteDirectory($tempExtractDir);
        return true;
    }

    private static function copyDirectory($src, $dst) {
        $dir = opendir($src);
        if (!$dir) return;
        @mkdir($dst, 0777, true);
        while (false !== ($file = readdir($dir))) {
            if (($file != '.') && ($file != '..')) {
                if (is_dir($src . '/' . $file)) {
                    self::copyDirectory($src . '/' . $file, $dst . '/' . $file);
                } else {
                    copy($src . '/' . $file, $dst . '/' . $file);
                }
            }
        }
        closedir($dir);
    }

    private static function deleteDirectory($dir) {
        if (!file_exists($dir)) return true;
        if (!is_dir($dir)) return unlink($dir);
        foreach (scandir($dir) as $item) {
            if ($item == '.' || $item == '..') continue;
            if (!self::deleteDirectory($dir . DIRECTORY_SEPARATOR . $item)) return false;
        }
        return rmdir($dir);
    }
}
