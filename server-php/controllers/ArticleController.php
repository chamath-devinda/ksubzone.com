<?php
namespace Controllers;

use Config\Database;
use Utils\Slug;

class ArticleController {
    private static function parseList($value) {
        if (is_array($value)) {
            return array_filter(array_map('trim', $value));
        }
        if (!$value) {
            return [];
        }
        return array_filter(array_map('trim', explode(',', $value)));
    }

    private static function normalizePayload($body, $existing = null) {
        $status = ($body['status'] ?? '') === 'Published' ? 'Published' : 'Draft';
        $publishedAt = null;
        if ($status === 'Published') {
            $publishedAt = !empty($body['publishedAt']) ? date('Y-m-d H:i:s', strtotime($body['publishedAt'])) : date('Y-m-d H:i:s');
        } elseif ($existing && isset($existing['publishedAt'])) {
            $publishedAt = $existing['publishedAt'];
        }

        return [
            'title' => $body['title'] ?? '',
            'excerpt' => $body['excerpt'] ?? '',
            'content' => $body['content'] ?? '',
            'category' => $body['category'] ?? 'Guide',
            'coverImage' => $body['coverImage'] ?? '',
            'authorName' => $body['authorName'] ?? 'KSubZone Editorial',
            'readTime' => isset($body['readTime']) ? (int)$body['readTime'] : 5,
            'status' => $status,
            'isFeatured' => !empty($body['isFeatured']),
            'tags' => self::parseList($body['tags'] ?? []),
            'relatedMediaTitle' => $body['relatedMediaTitle'] ?? '',
            'metaTitle' => $body['metaTitle'] ?? '',
            'metaDescription' => $body['metaDescription'] ?? '',
            'seoKeywords' => self::parseList($body['seoKeywords'] ?? []),
            'publishedAt' => $publishedAt
        ];
    }

    public static function getArticles() {
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 12);
        $search = $_GET['search'] ?? null;
        $category = $_GET['category'] ?? null;
        $status = $_GET['status'] ?? 'Published';
        $featured = $_GET['featured'] ?? null;
        $sort = $_GET['sort'] ?? 'newest';

        $filter = [];
        $filter['status'] = $status;

        if (!empty($search)) {
            $filter['$text'] = ['$search' => $search];
        }

        if (!empty($category) && $category !== 'All') {
            $dbInstance = Database::getInstance();
            $categoryName = $category;
            // Fetch articles to resolve slug dynamically
            $allArticles = $dbInstance->find('articles', ['status' => 'Published']);
            foreach ($allArticles as $art) {
                if (!empty($art['category']) && Slug::slugify($art['category']) === $category) {
                    $categoryName = $art['category'];
                    break;
                }
            }
            $filter['category'] = $categoryName;
        }

        if ($featured === 'true') {
            $filter['isFeatured'] = true;
        }

        $sortOptions = ['publishedAt' => -1, 'createdAt' => -1];
        if ($sort === 'popular') {
            $sortOptions = ['viewCount' => -1, 'publishedAt' => -1];
        } elseif ($sort === 'oldest') {
            $sortOptions = ['publishedAt' => 1, 'createdAt' => 1];
        }

        $skip = ($page - 1) * $limit;
        $db = Database::getInstance();
        $total = $db->count('articles', $filter);
        $articles = $db->find('articles', $filter, [
            'sort' => $sortOptions,
            'limit' => $limit,
            'skip' => $skip
        ]);

        header('Content-Type: application/json');
        echo json_encode([
            'total' => $total,
            'page' => $page,
            'totalPages' => ceil($total / $limit),
            'articles' => $articles
        ]);
    }

    public static function getArticleBySlug($slug) {
        $db = Database::getInstance();
        $article = $db->findOne('articles', ['slug' => $slug]);

        if (!$article || $article['status'] !== 'Published') {
            // Try clean slug legacy match
            $clean = Slug::cleanSlug($slug);
            $article = $db->findOne('articles', ['slug' => ['$in' => [$clean]]]);
            if (!$article || $article['status'] !== 'Published') {
                http_response_code(404);
                echo json_encode(['message' => 'Article not found']);
                return;
            }
        }

        // Increment views (wrapped in try-catch to prevent DB locking crashes)
        try {
            if ($db->getDriver() !== 'sqlite') {
                $views = ($article['viewCount'] ?? 0) + 1;
                $db->updateOne('articles', ['_id' => $article['_id']], ['viewCount' => $views]);
                $article['viewCount'] = $views;
            }
        } catch (\Exception $e) {
            // Ignore view count write-lock errors to keep page load stable
        }

        // Fetch related articles
        $tagsIn = !empty($article['tags']) ? $article['tags'] : [];
        $related = $db->find('articles', [
            '_id' => ['$ne' => $article['_id']],
            'status' => 'Published',
            '$or' => [
                ['category' => $article['category']],
                ['tags' => ['$in' => $tagsIn]]
            ]
        ], [
            'sort' => ['publishedAt' => -1],
            'limit' => 3
        ]);

        header('Content-Type: application/json');
        echo json_encode([
            'article' => $article,
            'related' => $related
        ]);
    }

    public static function adminGetArticles() {
        $search = $_GET['search'] ?? null;
        $status = $_GET['status'] ?? null;
        $category = $_GET['category'] ?? null;

        $filter = [];
        if (!empty($status) && $status !== 'All') {
            $filter['status'] = $status;
        }
        if (!empty($category) && $category !== 'All') {
            $filter['category'] = $category;
        }
        if (!empty($search)) {
            $filter['$text'] = ['$search' => $search];
        }

        $db = Database::getInstance();
        $articles = $db->find('articles', $filter, [
            'sort' => ['updatedAt' => -1],
            'limit' => 200
        ]);

        header('Content-Type: application/json');
        echo json_encode($articles);
    }

    public static function createArticle() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        if (empty($body['title']) || empty($body['content'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Article title and content are required']);
            return;
        }

        $db = Database::getInstance();
        $payload = self::normalizePayload($body);

        $payload['slug'] = Slug::createUniqueSlug(function($candidate) use ($db) {
            return $db->findOne('articles', ['slug' => $candidate]);
        }, $payload['title']);

        if (empty($payload['metaTitle'])) {
            $payload['metaTitle'] = "{$payload['title']} | KSubZone Articles";
        }
        if (empty($payload['metaDescription'])) {
            $payload['metaDescription'] = !empty($payload['excerpt']) ? $payload['excerpt'] : substr(strip_tags($payload['content']), 0, 155);
        }

        $payload['viewCount'] = 0;
        $inserted = $db->insertOne('articles', $payload);

        http_response_code(201);
        echo json_encode(['message' => 'Article created successfully', 'article' => $inserted]);
    }

    public static function updateArticle($id) {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $db = Database::getInstance();

        $article = $db->findOne('articles', ['_id' => $id]);
        if (!$article) {
            http_response_code(404);
            echo json_encode(['message' => 'Article not found']);
            return;
        }

        $updates = self::normalizePayload($body, $article);

        if (!empty($updates['title']) && $updates['title'] !== $article['title']) {
            $updates['slug'] = Slug::createUniqueSlug(function($candidate) use ($db) {
                return $db->findOne('articles', ['slug' => $candidate]);
            }, $updates['title'], $article['_id']);
        }

        if ($updates['status'] === 'Published' && empty($article['publishedAt'])) {
            $updates['publishedAt'] = date('Y-m-d H:i:s');
        }

        if (empty($updates['metaTitle'])) {
            $title = $updates['title'] ?: $article['title'];
            $updates['metaTitle'] = "{$title} | KSubZone Articles";
        }

        if (empty($updates['metaDescription'])) {
            $excerpt = $updates['excerpt'] ?: $article['excerpt'] ?: '';
            $content = $updates['content'] ?: $article['content'] ?: '';
            $source = !empty($excerpt) ? $excerpt : strip_tags($content);
            $updates['metaDescription'] = substr($source, 0, 155);
        }

        $db->updateOne('articles', ['_id' => $id], $updates);
        $saved = $db->findOne('articles', ['_id' => $id]);

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Article updated successfully', 'article' => $saved]);
    }

    public static function deleteArticle($id) {
        $db = Database::getInstance();
        $deleted = $db->deleteOne('articles', ['_id' => $id]);
        if (!$deleted) {
            http_response_code(404);
            echo json_encode(['message' => 'Article not found']);
            return;
        }

        header('Content-Type: application/json');
        echo json_encode(['message' => 'Article deleted successfully']);
    }
}
