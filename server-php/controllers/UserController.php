<?php
namespace Controllers;

use Config\Database;
use Middleware\AuthMiddleware;

class UserController {
    public static function getUserProfile() {
        $user = AuthMiddleware::$currentUser;
        unset($user['password']);
        header('Content-Type: application/json');
        echo json_encode($user);
    }

    public static function updateUserProfile() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $username = trim($body['username'] ?? '');
        $email = trim(strtolower($body['email'] ?? ''));
        $avatar = $body['avatar'] ?? '';
        $password = $body['password'] ?? '';

        $user = AuthMiddleware::$currentUser;
        $db = Database::getInstance();

        $update = [];
        if (!empty($username)) $update['username'] = $username;
        if (!empty($email)) $update['email'] = $email;
        if (!empty($avatar)) $update['avatar'] = $avatar;
        if (!empty($password)) $update['password'] = password_hash($password, PASSWORD_BCRYPT);

        $db->updateOne('users', ['_id' => $user['_id']], $update);

        // Fetch updated user
        $updatedUser = $db->findOne('users', ['_id' => $user['_id']]);

        header('Content-Type: application/json');
        echo json_encode([
            'message' => 'Profile updated successfully',
            'user' => [
                'id' => $updatedUser['_id'],
                'username' => $updatedUser['username'],
                'email' => $updatedUser['email'],
                'avatar' => $updatedUser['avatar'] ?? ''
            ]
        ]);
    }

    public static function toggleWatchlist() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $mediaId = $body['mediaId'] ?? '';
        $mediaType = $body['mediaType'] ?? '';

        if (empty($mediaId) || empty($mediaType)) {
            http_response_code(400);
            echo json_encode(['message' => 'mediaId and mediaType are required']);
            return;
        }

        $user = AuthMiddleware::$currentUser;
        $db = Database::getInstance();

        $watchlist = $user['watchlist'] ?? [];
        $existingIndex = -1;
        foreach ($watchlist as $idx => $item) {
            if ((string)$item['mediaId'] === (string)$mediaId) {
                $existingIndex = $idx;
                break;
            }
        }

        if ($existingIndex > -1) {
            array_splice($watchlist, $existingIndex, 1);
            $msg = 'Removed from Watchlist';
        } else {
            $watchlist[] = ['mediaId' => $mediaId, 'mediaType' => $mediaType];
            $msg = 'Added to Watchlist';
        }

        $db->updateOne('users', ['_id' => $user['_id']], ['watchlist' => $watchlist]);

        header('Content-Type: application/json');
        echo json_encode(['message' => $msg, 'watchlist' => $watchlist]);
    }

    public static function toggleFavorites() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $mediaId = $body['mediaId'] ?? '';
        $mediaType = $body['mediaType'] ?? '';

        if (empty($mediaId) || empty($mediaType)) {
            http_response_code(400);
            echo json_encode(['message' => 'mediaId and mediaType are required']);
            return;
        }

        $user = AuthMiddleware::$currentUser;
        $db = Database::getInstance();

        $favorites = $user['favorites'] ?? [];
        $existingIndex = -1;
        foreach ($favorites as $idx => $item) {
            if ((string)$item['mediaId'] === (string)$mediaId) {
                $existingIndex = $idx;
                break;
            }
        }

        if ($existingIndex > -1) {
            array_splice($favorites, $existingIndex, 1);
            $msg = 'Removed from Favorites';
        } else {
            $favorites[] = ['mediaId' => $mediaId, 'mediaType' => $mediaType];
            $msg = 'Added to Favorites';
        }

        $db->updateOne('users', ['_id' => $user['_id']], ['favorites' => $favorites]);

        header('Content-Type: application/json');
        echo json_encode(['message' => $msg, 'favorites' => $favorites]);
    }

    public static function updateContinueWatching() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $mediaId = $body['mediaId'] ?? '';
        $mediaType = $body['mediaType'] ?? '';
        $seasonNumber = $body['seasonNumber'] ?? null;
        $episodeNumber = $body['episodeNumber'] ?? null;
        $progress = $body['progress'] ?? 0;
        $duration = $body['duration'] ?? 0;

        if (empty($mediaId) || empty($mediaType)) {
            http_response_code(400);
            echo json_encode(['message' => 'mediaId and mediaType are required']);
            return;
        }

        $user = AuthMiddleware::$currentUser;
        $db = Database::getInstance();

        $continueWatching = $user['continueWatching'] ?? [];
        $existingIndex = -1;
        foreach ($continueWatching as $idx => $item) {
            if ((string)$item['mediaId'] === (string)$mediaId) {
                $existingIndex = $idx;
                break;
            }
        }

        $record = [
            'mediaId' => $mediaId,
            'mediaType' => $mediaType,
            'seasonNumber' => $seasonNumber,
            'episodeNumber' => $episodeNumber,
            'progress' => $progress,
            'duration' => $duration,
            'updatedAt' => date('Y-m-d H:i:s')
        ];

        if ($existingIndex > -1) {
            $continueWatching[$existingIndex] = $record;
        } else {
            $continueWatching[] = $record;
        }

        // Sort descending by updatedAt
        usort($continueWatching, function($a, $b) {
            $t1 = isset($a['updatedAt']) && is_string($a['updatedAt']) ? (strtotime($a['updatedAt']) ?: 0) : 0;
            $t2 = isset($b['updatedAt']) && is_string($b['updatedAt']) ? (strtotime($b['updatedAt']) ?: 0) : 0;
            return $t2 <=> $t1;
        });

        // Limit to 20
        if (count($continueWatching) > 20) {
            array_pop($continueWatching);
        }

        $db->updateOne('users', ['_id' => $user['_id']], ['continueWatching' => $continueWatching]);

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Play progress updated', 'continueWatching' => $continueWatching]);
    }

    public static function getUserNotifications() {
        $user = AuthMiddleware::$currentUser;
        $db = Database::getInstance();

        // System broadcasts (recipient = null) & direct user alerts
        $notifications = $db->find('notifications', [
            '$or' => [
                ['recipient' => $user['_id']],
                ['recipient' => null, 'recipientType' => 'User']
            ]
        ], ['sort' => ['createdAt' => -1]]);

        header('Content-Type: application/json');
        echo json_encode($notifications);
    }

    public static function markNotificationRead($id) {
        $db = Database::getInstance();
        $notification = $db->findOne('notifications', ['_id' => $id]);
        if (!$notification) {
            http_response_code(404);
            echo json_encode(['message' => 'Notification not found']);
            return;
        }

        $db->updateOne('notifications', ['_id' => $id], ['isRead' => true]);
        $notification['isRead'] = true;

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Notification marked read', 'notification' => $notification]);
    }
}
