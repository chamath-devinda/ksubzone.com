<?php
namespace Utils;

/**
 * Builds the small media records used by catalog cards and hero banners.
 * Detail-only SEO, cast, FAQ and schema fields can add tens of kilobytes to
 * every record and should only be returned by the detail endpoints.
 */
class MediaPayload {
    private static $detailOnlyFields = [
        'faq',
        'schemaMarkup',
        'seoKeywords',
        'storyOverview',
        'castOverview',
        'seriesOverview',
        'aiSeoDescription',
        'metaDescription',
        'metaTitle',
        'cast',
        'productionCompanies',
        'writers',
        'director',
        'images'
    ];

    private static $catalogFields = [
        '_id',
        'title',
        'originalTitle',
        'slug',
        'poster',
        'banner',
        'backdrop',
        'backdrops',
        'releaseDate',
        'contentUpdatedAt',
        'createdAt',
        'status',
        'country',
        'language',
        'imdbRating',
        'tmdbRating',
        'ratingCount',
        'viewCount',
        'runtime',
        'keywords',
        'genres',
        'genre',
        'isNew',
        'isHistorical',
        'isTrending',
        'subtitleCount',
        'subtitleSummary',
        'mediaType',
        '_mediaType'
    ];

    public static function compact($item, $includeSynopsis = false) {
        if (!is_array($item)) {
            return [];
        }

        $result = [];
        foreach (self::$catalogFields as $field) {
            if (array_key_exists($field, $item)) {
                $result[$field] = $item[$field];
            }
        }

        // Cards only show a couple of tags and one backdrop. Keeping bounded
        // arrays prevents imported TMDB payloads from growing catalog JSON.
        foreach (['keywords', 'genres'] as $field) {
            if (isset($result[$field]) && is_array($result[$field])) {
                $result[$field] = array_slice($result[$field], 0, 8);
            }
        }
        if (isset($result['backdrops']) && is_array($result['backdrops'])) {
            $result['backdrops'] = array_slice($result['backdrops'], 0, 1);
        }

        if ($includeSynopsis) {
            foreach (['synopsisRewrite', 'description'] as $field) {
                if (!empty($item[$field])) {
                    $result[$field] = self::truncate((string)$item[$field], 700);
                }
            }
        }

        return $result;
    }

    public static function compactMany($items, $includeSynopsis = false) {
        $result = [];
        foreach ((array)$items as $item) {
            $result[] = self::compact($item, $includeSynopsis);
        }
        return $result;
    }

    public static function detailOnlyFields($includeSynopsis = false) {
        $fields = self::$detailOnlyFields;
        if (!$includeSynopsis) {
            $fields[] = 'synopsisRewrite';
            $fields[] = 'description';
        }
        return $fields;
    }

    private static function truncate($value, $limit) {
        if (function_exists('mb_strlen') && function_exists('mb_substr')) {
            return mb_strlen($value, 'UTF-8') > $limit
                ? mb_substr($value, 0, $limit, 'UTF-8') . '…'
                : $value;
        }

        return strlen($value) > $limit ? substr($value, 0, $limit) . '...' : $value;
    }
}
