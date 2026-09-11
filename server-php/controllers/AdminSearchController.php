<?php
namespace Controllers;
use Config\Database;
use Middleware\AuthMiddleware;

final class AdminSearchController {
    public static function search() {
        $query = trim((string)($_GET['q'] ?? ''));
        if (strlen($query) < 2 || strlen($query) > 100) {
            echo json_encode(['results' => []]); return;
        }
        $role = AuthMiddleware::$currentAdmin['role'] ?? [];
        $permissions = is_array($role) ? array_column($role['permissions'] ?? [], 'name') : [];
        $super = is_array($role) && ($role['name'] ?? '') === 'SuperAdmin';
        $modules = [
            ['movies', 'Movies', 'title', 'manage_movies'],
            ['dramas', 'Dramas', 'title', 'manage_dramas'],
            ['articles', 'Articles', 'title', 'manage_articles'],
            ['subtitles', 'Subtitles', 'originalFilename', 'approve_subtitles']
        ];
        $results = [];
        $db = Database::getInstance();
        foreach ($modules as $module) {
            list($table, $label, $field, $permission) = $module;
            if (!$super && !in_array($permission, $permissions, true)) continue;
            $filter = [$field => ['$regex' => preg_quote($query, '/'), '$options' => 'i']];
            foreach ($db->find($table, $filter, ['limit' => 5, 'sort' => ['createdAt' => -1]]) as $row) {
                $results[] = ['id' => (string)$row['_id'], 'title' => (string)($row[$field] ?? ''),
                    'type' => $label, 'href' => '/management/' . $table . '?q=' . rawurlencode((string)($row[$field] ?? ''))];
            }
        }
        echo json_encode(['results' => $results]);
    }
}
