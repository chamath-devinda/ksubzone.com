<?php
namespace Utils;

final class AdminValidation {
    /** Common content schema; partial updates validate only supplied fields. */
    public static function content(array $data) {
        $errors = [];
        if (array_key_exists('title', $data) && (!is_string($data['title']) || trim($data['title']) === '' || strlen($data['title']) > 500)) {
            $errors['title'] = 'Enter a title between 1 and 500 bytes.';
        }
        $numericBounds = [
            'runtime' => [0, 100000],
            'tmdbRating' => [0, 10],
            'imdbRating' => [0, 10],
            'seasonNumber' => [0, 10000],
            'episodeNumber' => [1, 100000]
        ];
        foreach ($numericBounds as $key => $bounds) {
            $min = $bounds[0];
            $max = $bounds[1];
            if (!isset($data[$key]) || $data[$key] === '') continue;
            if (!is_numeric($data[$key]) || !is_finite((float)$data[$key]) || $data[$key] < $min || $data[$key] > $max) {
                $errors[$key] = "Enter a number between {$min} and {$max}.";
            }
        }
        foreach (['poster', 'banner', 'trailer', 'coverImage'] as $key) {
            if (empty($data[$key])) continue;
            $url = $data[$key];
            if (!is_string($url) || strlen($url) > 2048 || (!preg_match('#^https?://#i', $url) && !preg_match('#^/(?!/)#', $url))) {
                $errors[$key] = 'Use an HTTP(S) URL or a site-relative path.';
            }
        }
        foreach (['releaseDate', 'airDate'] as $key) {
            if (!empty($data[$key]) && (!is_string($data[$key]) || strtotime($data[$key]) === false)) {
                $errors[$key] = 'Enter a valid date.';
            }
        }
        if (isset($data['status']) && !in_array($data['status'], ['Published', 'Draft', 'Upcoming', 'Archived', 'Ongoing', 'Completed'], true)) {
            $errors['status'] = 'Choose a valid publishing status.';
        }
        if (array_key_exists('_id', $data) || array_key_exists('id', $data)) {
            $errors['id'] = 'Record identity cannot be changed.';
        }
        return $errors;
    }

    public static function accept(array $data) {
        $errors = self::content($data);
        if (!$errors) return true;
        http_response_code(422);
        echo json_encode(['message' => 'Please correct the highlighted fields.', 'errors' => $errors]);
        return false;
    }

    public static function redact(array $document) {
        foreach ($document as $key => $value) {
            if (preg_match('/password|secret|token|api[_-]?key|credential|recoverycode/i', (string)$key)) $document[$key] = '********';
            elseif (is_array($value)) $document[$key] = self::redact($value);
        }
        if (isset($document['key']) && preg_match('/password|secret|token|api[_-]?key|credential/i', (string)$document['key'])) $document['value'] = '********';
        return $document;
    }
}
