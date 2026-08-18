<?php
namespace Controllers;

use Config\Database;
use Middleware\AuthMiddleware;

class CommentController {
    /* --- REVIEWS --- */

    public static function addReview() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $mediaId = $body['mediaId'] ?? '';
        $mediaType = $body['mediaType'] ?? '';
        $rating = $body['rating'] ?? '';
        $content = $body['content'] ?? '';

        if (empty($mediaId) || empty($mediaType) || empty($rating) || empty($content)) {
            http_response_code(400);
            echo json_encode(['message' => 'mediaId, mediaType, rating (1-10), and content are required']);
            return;
        }

        $user = AuthMiddleware::$currentUser;
        $db = Database::getInstance();

        // Check if user already reviewed
        $existing = $db->findOne('reviews', [
            'mediaId' => $mediaId,
            'user' => $user['_id']
        ]);

        if ($existing) {
            http_response_code(400);
            echo json_encode(['message' => 'You have already submitted a review for this content']);
            return;
        }

        $review = [
            'mediaId' => $mediaId,
            'mediaType' => $mediaType,
            'user' => $user['_id'],
            'rating' => (int)$rating,
            'content' => $content,
            'likes' => [],
            'status' => 'Approved'
        ];

        $inserted = $db->insertOne('reviews', $review);

        // Dynamically update average rating of Movie or Drama
        $allReviews = $db->find('reviews', ['mediaId' => $mediaId]);
        $sum = 0;
        foreach ($allReviews as $r) {
            $sum += (float)($r['rating'] ?? 0);
        }
        $avg = count($allReviews) > 0 ? round($sum / count($allReviews), 1) : 0;

        $table = $mediaType === 'Movie' ? 'movies' : 'dramas';
        $db->updateOne($table, ['_id' => $mediaId], ['imdbRating' => $avg]);

        // Invalidate details page cache
        if (strtolower($mediaType) === 'movie') {
            \Utils\Cache::delete("movie_detail_" . $mediaId);
        } else {
            \Utils\Cache::delete("drama_detail_" . $mediaId);
        }

        http_response_code(201);
        echo json_encode(['message' => 'Review added successfully', 'review' => $inserted]);
    }

    public static function getReviewsForMedia($mediaId) {
        $db = Database::getInstance();
        $reviews = $db->find('reviews', [
            'mediaId' => $mediaId,
            'status' => 'Approved'
        ], ['sort' => ['createdAt' => -1]]);

        // Populate user details
        foreach ($reviews as &$r) {
            $u = $db->findOne('users', ['_id' => $r['user']]);
            $r['user'] = $u ? [
                '_id' => $u['_id'],
                'username' => $u['username'],
                'avatar' => $u['avatar'] ?? ''
            ] : null;
        }

        header('Content-Type: application/json');
        echo json_encode($reviews);
    }

    public static function likeReview($id) {
        $user = AuthMiddleware::$currentUser;
        $db = Database::getInstance();

        $review = $db->findOne('reviews', ['_id' => $id]);
        if (!$review) {
            http_response_code(404);
            echo json_encode(['message' => 'Review not found']);
            return;
        }

        $likes = $review['likes'] ?? [];
        $likeIndex = array_search((string)$user['_id'], $likes);

        if ($likeIndex !== false) {
            array_splice($likes, $likeIndex, 1);
        } else {
            $likes[] = (string)$user['_id'];
        }

        $db->updateOne('reviews', ['_id' => $id], ['likes' => $likes]);

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Review liked/unliked', 'likes' => count($likes)]);
    }

    /* --- COMMENTS & NESTED REPLIES --- */

    public static function addComment() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $targetId = $body['targetId'] ?? '';
        $targetType = $body['targetType'] ?? '';
        $content = $body['content'] ?? '';

        if (empty($targetId) || empty($targetType) || empty($content)) {
            http_response_code(400);
            echo json_encode(['message' => 'targetId, targetType, and content are required']);
            return;
        }

        $user = AuthMiddleware::$currentUser;
        $db = Database::getInstance();

        $comment = [
            'targetId' => $targetId,
            'targetType' => $targetType,
            'user' => $user['_id'],
            'content' => $content,
            'likes' => [],
            'replies' => []
        ];

        $inserted = $db->insertOne('comments', $comment);

        // Clear details page cache
        if (strtolower($targetType) === 'movie') {
            \Utils\Cache::delete("movie_detail_" . $targetId);
        } else {
            \Utils\Cache::delete("drama_detail_" . $targetId);
        }

        http_response_code(201);
        echo json_encode(['message' => 'Comment posted', 'comment' => $inserted]);
    }

    public static function fetchCommentsForTargetWithBatchPopulate($targetId) {
        $db = Database::getInstance();
        $comments = $db->find('comments', [
            'targetId' => $targetId
        ], ['sort' => ['createdAt' => -1]]);

        // Gather all unique user IDs
        $userIds = [];
        foreach ($comments as $c) {
            if (!empty($c['user'])) {
                $userIds[] = $c['user'];
            }
            if (isset($c['replies']) && is_array($c['replies'])) {
                foreach ($c['replies'] as $rep) {
                    if (!empty($rep['user'])) {
                        $userIds[] = $rep['user'];
                    }
                }
            }
        }
        $userIds = array_values(array_unique($userIds));

        // Fetch all users in one query
        $userMap = [];
        if (!empty($userIds)) {
            $usersList = $db->find('users', ['_id' => ['$in' => $userIds]]);
            foreach ($usersList as $u) {
                $userMap[$u['_id']] = [
                    '_id' => $u['_id'],
                    'username' => $u['username'],
                    'avatar' => $u['avatar'] ?? ''
                ];
            }
        }

        // Populate commenters and repliers using the map
        foreach ($comments as &$c) {
            $c['user'] = !empty($c['user']) ? ($userMap[$c['user']] ?? null) : null;

            if (isset($c['replies']) && is_array($c['replies'])) {
                foreach ($c['replies'] as &$rep) {
                    $rep['user'] = !empty($rep['user']) ? ($userMap[$rep['user']] ?? null) : null;
                }
            }
        }

        return $comments;
    }

    public static function getCommentsForTarget($targetId) {
        $comments = self::fetchCommentsForTargetWithBatchPopulate($targetId);
        header('Content-Type: application/json');
        echo json_encode($comments);
    }

    public static function addReply($commentId) {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $content = $body['content'] ?? '';

        if (empty($content)) {
            http_response_code(400);
            echo json_encode(['message' => 'Reply content is required']);
            return;
        }

        $user = AuthMiddleware::$currentUser;
        $db = Database::getInstance();

        $comment = $db->findOne('comments', ['_id' => $commentId]);
        if (!$comment) {
            http_response_code(404);
            echo json_encode(['message' => 'Comment not found']);
            return;
        }

        $replies = $comment['replies'] ?? [];
        $replies[] = [
            'user' => $user['_id'],
            'content' => $content,
            'likes' => [],
            'createdAt' => date('Y-m-d H:i:s')
        ];

        $db->updateOne('comments', ['_id' => $commentId], ['replies' => $replies]);
        $updated = $db->findOne('comments', ['_id' => $commentId]);

        // Invalidate details page cache
        if (!empty($comment['targetType']) && !empty($comment['targetId'])) {
            $targetType = strtolower($comment['targetType']);
            $targetId = $comment['targetId'];
            if ($targetType === 'movie') {
                \Utils\Cache::delete("movie_detail_" . $targetId);
            } else {
                \Utils\Cache::delete("drama_detail_" . $targetId);
            }
        }

        http_response_code(201);
        echo json_encode(['message' => 'Reply added successfully', 'comment' => $updated]);
    }

    public static function likeComment($id) {
        $user = AuthMiddleware::$currentUser;
        $db = Database::getInstance();

        $comment = $db->findOne('comments', ['_id' => $id]);
        if (!$comment) {
            http_response_code(404);
            echo json_encode(['message' => 'Comment not found']);
            return;
        }

        $likes = $comment['likes'] ?? [];
        $likeIndex = array_search((string)$user['_id'], $likes);

        if ($likeIndex !== false) {
            array_splice($likes, $likeIndex, 1);
        } else {
            $likes[] = (string)$user['_id'];
        }

        $db->updateOne('comments', ['_id' => $id], ['likes' => $likes]);
        $updated = $db->findOne('comments', ['_id' => $id]);

        // Invalidate details page cache
        if (!empty($comment['targetType']) && !empty($comment['targetId'])) {
            $targetType = strtolower($comment['targetType']);
            $targetId = $comment['targetId'];
            if ($targetType === 'movie') {
                \Utils\Cache::delete("movie_detail_" . $targetId);
            } else {
                \Utils\Cache::delete("drama_detail_" . $targetId);
            }
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Comment liked/unliked', 'comment' => $updated]);
    }

    /* --- ADMIN MODULES --- */

    public static function adminGetAllReviews() {
        $db = Database::getInstance();
        $reviews = $db->find('reviews', [], ['sort' => ['createdAt' => -1]]);

        foreach ($reviews as &$r) {
            $u = $db->findOne('users', ['_id' => $r['user']]);
            $r['user'] = $u ? [
                '_id' => $u['_id'],
                'username' => $u['username'],
                'email' => $u['email'] ?? ''
            ] : null;
        }

        header('Content-Type: application/json');
        echo json_encode($reviews);
    }

    public static function adminDeleteReview($id) {
        $db = Database::getInstance();
        $review = $db->findOne('reviews', ['_id' => $id]);
        $deleted = $db->deleteOne('reviews', ['_id' => $id]);
        if (!$deleted) {
            http_response_code(404);
            echo json_encode(['message' => 'Review not found']);
            return;
        }

        // Invalidate details page cache
        if ($review && !empty($review['mediaType']) && !empty($review['mediaId'])) {
            $mediaType = strtolower($review['mediaType']);
            $mediaId = $review['mediaId'];
            if ($mediaType === 'movie') {
                \Utils\Cache::delete("movie_detail_" . $mediaId);
            } else {
                \Utils\Cache::delete("drama_detail_" . $mediaId);
            }
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Review deleted by administrator']);
    }

    public static function adminGetAllComments() {
        $db = Database::getInstance();
        $comments = $db->find('comments', [], ['sort' => ['createdAt' => -1]]);

        foreach ($comments as &$c) {
            $u = $db->findOne('users', ['_id' => $c['user']]);
            $c['user'] = $u ? [
                '_id' => $u['_id'],
                'username' => $u['username'],
                'email' => $u['email'] ?? ''
            ] : null;
        }

        header('Content-Type: application/json');
        echo json_encode($comments);
    }

    public static function adminDeleteComment($id) {
        $db = Database::getInstance();
        $comment = $db->findOne('comments', ['_id' => $id]);
        $deleted = $db->deleteOne('comments', ['_id' => $id]);
        if (!$deleted) {
            http_response_code(404);
            echo json_encode(['message' => 'Comment not found']);
            return;
        }

        // Invalidate details page cache
        if ($comment && !empty($comment['targetType']) && !empty($comment['targetId'])) {
            $targetType = strtolower($comment['targetType']);
            $targetId = $comment['targetId'];
            if ($targetType === 'movie') {
                \Utils\Cache::delete("movie_detail_" . $targetId);
            } else {
                \Utils\Cache::delete("drama_detail_" . $targetId);
            }
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Comment deleted by administrator']);
    }
}
