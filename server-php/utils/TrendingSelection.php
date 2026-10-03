<?php
namespace Utils;

use Config\Database;

/**
 * Admin-only toggle for the homepage "Trending Now" selection.
 *
 * This intentionally does not touch contentUpdatedAt: adding or removing a
 * title from Trending Now is a curation change, not new content, so it must
 * not move the title to the top of the "Latest" homepage rows.
 */
final class TrendingSelection {
    private static $collections = [
        'movies' => 'movie',
        'dramas' => 'drama'
    ];

    public static function update($collection, $id) {
        header('Content-Type: application/json');

        if (!isset(self::$collections[$collection])) {
            http_response_code(400);
            echo json_encode(['message' => 'Unsupported media type.']);
            return;
        }

        $body = json_decode(file_get_contents('php://input'), true);
        if (!is_array($body) || !array_key_exists('isTrending', $body) || !is_bool($body['isTrending'])) {
            http_response_code(422);
            echo json_encode(['message' => 'isTrending must be true or false.']);
            return;
        }

        $db = Database::getInstance();
        $record = $db->findOne($collection, ['_id' => $id]);
        if (!$record) {
            http_response_code(404);
            echo json_encode(['message' => 'Title not found.']);
            return;
        }

        $isTrending = $body['isTrending'];
        $updates = [
            'isTrending' => $isTrending,
            'updatedAt' => gmdate('Y-m-d H:i:s')
        ];
        if (!$isTrending) {
            $updates['trendingSelectedAt'] = null;
        } elseif (empty($record['isTrending']) || empty($record['trendingSelectedAt'])) {
            // A fresh (or re-confirmed legacy) selection goes to the front of
            // the homepage row, which is ordered by trendingSelectedAt DESC.
            $updates['trendingSelectedAt'] = gmdate(DATE_ATOM);
        }

        try {
            $db->updateOne($collection, ['_id' => $id], $updates);
        } catch (\Exception $e) {
            error_log('TrendingSelection::update DB error for ' . $collection . ' ' . $id . ': ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Database error while updating Trending Now.']);
            return;
        }

        $type = self::$collections[$collection];
        try { Cache::flush(); } catch (\Exception $e) {}
        try { Revalidate::catalog($type); } catch (\Exception $e) {}

        $updated = $db->findOne($collection, ['_id' => $id]);
        echo json_encode([
            'message' => $isTrending ? 'Added to Trending Now.' : 'Removed from Trending Now.',
            'item' => MediaPayload::compact($updated ?: [])
        ]);
    }
}
