<?php
namespace Utils;

class Slug {
    public static function slugify($value = '') {
        $slug = (string)$value;
        $slug = strtolower(trim($slug));
        $slug = preg_replace('/[^a-z0-9]+/i', '-', $slug);
        $slug = preg_replace('/^-+|-+$/', '', $slug);
        return $slug ?: 'untitled';
    }

    public static function cleanSlug($value = '') {
        return preg_replace('/-\d+$/', '', (string)$value);
    }

    public static function normalizePermalinkSlug($value = '') {
        $slug = trim((string)$value);
        if ($slug === '') {
            return '';
        }

        $slug = rawurldecode($slug);
        $slug = preg_split('/[?#]/', $slug)[0];
        $slug = trim($slug, '/');

        if (preg_match_all('~(?:^|/)(?:movie|drama)/([^/?#]+)~i', $slug, $matches) && !empty($matches[1])) {
            $slug = end($matches[1]);
        } elseif (preg_match('~https?://~i', $slug)) {
            $parts = preg_split('~https?://[^/]+/(?:movie|drama)/~i', $slug, -1, PREG_SPLIT_NO_EMPTY);
            if (!empty($parts)) {
                $slug = end($parts);
            }
        }

        return self::slugify($slug);
    }

    public static function createUniqueSlug($checkCallback, $title, $existingId = null) {
        $baseSlug = self::slugify($title);
        $candidate = $baseSlug;
        $suffix = 2;

        while (true) {
            $existing = call_user_func($checkCallback, $candidate);
            if (!$existing || ($existingId && (string)$existing['_id'] === (string)$existingId)) {
                return $candidate;
            }
            $candidate = $baseSlug . '-' . $suffix;
            $suffix++;
        }
    }

    public static function findByPermalinkSlug($db, $collection, $slug) {
        // 1. Try finding by raw URL-decoded input slug first to support unicode/Sinhala slugs
        $decoded = rawurldecode($slug);
        $decoded = preg_split('/[?#]/', $decoded)[0];
        $decoded = trim($decoded, '/');
        
        // Strip movie/drama prefixes if present
        if (preg_match_all('~(?:^|/)(?:movie|drama)/([^/?#]+)~i', $decoded, $matches) && !empty($matches[1])) {
            $decoded = end($matches[1]);
        } elseif (preg_match('~https?://~i', $decoded)) {
            $parts = preg_split('~https?://[^/]+/(?:movie|drama)/~i', $decoded, -1, PREG_SPLIT_NO_EMPTY);
            if (!empty($parts)) {
                $decoded = end($parts);
            }
        }
        
        if (!empty($decoded)) {
            $doc = $db->findOne($collection, ['slug' => $decoded]);
            if ($doc) {
                return $doc;
            }
            // Try matching lowercase as database collation might be case sensitive or insensitive
            $doc = $db->findOne($collection, ['slug' => strtolower($decoded)]);
            if ($doc) {
                return $doc;
            }
        }

        // 2. Fallback to slugified behavior for backwards compatibility
        $normalized = self::normalizePermalinkSlug($slug);

        $doc = $db->findOne($collection, ['slug' => $normalized]);
        if ($doc) {
            return $doc;
        }

        $clean = self::cleanSlug($normalized);
        if ($clean !== $normalized) {
            $doc = $db->findOne($collection, ['slug' => $clean]);
            if ($doc) {
                return $doc;
            }
        }

        return $db->findOne($collection, [
            'slug' => ['$regex' => '^' . preg_quote($clean, '/') . '-[0-9]+$']
        ], ['sort' => ['createdAt' => 1]]);
    }
}
