<?php
namespace Controllers;

use Config\Database;
use Middleware\AuthMiddleware;

/** Admin-scoped notification feed; user notifications never leak here. */
class AdminNotificationController {
    public static function list() {
        if (!AuthMiddleware::$currentAdmin) {
            http_response_code(401);
            echo json_encode(['message' => 'Unauthorized']);
            return;
        }

        $db = Database::getInstance();
        $notifications = $db->find('notifications', ['recipientType' => 'Admin'], [
            'sort' => ['createdAt' => -1],
            'limit' => 50
        ]);

        $items = array_map(function ($notification) {
            $type = $notification['type'] ?? 'system';
            return [
                'id' => (string)($notification['_id'] ?? ''),
                'title' => $notification['title'] ?? 'Admin notification',
                'message' => $notification['message'] ?? '',
                'type' => $type,
                'href' => str_contains($type, 'subtitle') ? '/management/subtitles' : '/management/dashboard',
                'isRead' => (bool)($notification['isRead'] ?? false),
                'createdAt' => $notification['createdAt'] ?? null,
                'source' => 'database'
            ];
        }, $notifications);

        header('Content-Type: application/json');
        echo json_encode(['notifications' => $items]);
    }

    public static function markRead($id) {
        $db = Database::getInstance();
        $notification = $db->findOne('notifications', ['_id' => $id, 'recipientType' => 'Admin']);
        if (!$notification) {
            http_response_code(404);
            echo json_encode(['message' => 'Admin notification not found']);
            return;
        }

        $db->updateOne('notifications', ['_id' => $id], ['isRead' => true]);
        header('Content-Type: application/json');
        echo json_encode(['message' => 'Notification marked read', 'id' => (string)$id]);
    }
}
