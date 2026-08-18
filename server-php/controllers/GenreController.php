<?php
namespace Controllers;

use Config\Database;

class GenreController {
    public static function getAllGenres() {
        $db = Database::getInstance();
        $genres = $db->find('genres', [], ['sort' => ['name' => 1]]);

        foreach ($genres as &$genre) {
            $name = $genre['name'];
            $movieCount = $db->count('movies', ['keywords' => ['$in' => [$name]]]);
            $dramaCount = $db->count('dramas', ['keywords' => ['$in' => [$name]]]);
            $genre['movieCount'] = $movieCount;
            $genre['dramaCount'] = $dramaCount;
            $genre['totalCount'] = $movieCount + $dramaCount;

            // Find a backdrop/banner image from high-rated titles in this genre
            $backdrop = null;
            if ($movieCount > 0) {
                $movie = $db->findOne('movies', ['keywords' => ['$in' => [$name]]], ['sort' => ['imdbRating' => -1, 'tmdbRating' => -1]]);
                if ($movie) {
                    $backdrop = $movie['banner'] ?? $movie['poster'] ?? (!empty($movie['backdrops']) ? $movie['backdrops'][0] : null);
                }
            }
            if (!$backdrop && $dramaCount > 0) {
                $drama = $db->findOne('dramas', ['keywords' => ['$in' => [$name]]], ['sort' => ['imdbRating' => -1, 'tmdbRating' => -1]]);
                if ($drama) {
                    $backdrop = $drama['banner'] ?? $drama['poster'] ?? (!empty($drama['backdrops']) ? $drama['backdrops'][0] : null);
                }
            }
            $genre['banner'] = $backdrop;
        }
        unset($genre);

        header('Content-Type: application/json');
        echo json_encode($genres);
    }
}
