<?php
namespace Controllers;

class AiSeoController {
    public static function generateFaqList($title, $type, $genres, $director, $cast, $releaseYear) {
        $genresStr = !empty($genres) ? implode(', ', $genres) : 'Drama';
        $directorStr = $director ?: 'the director';
        $castStr = !empty($cast) ? implode(', ', array_slice($cast, 0, 3)) : 'a talented ensemble';

        return [
            [
                'question' => "What is {$title} about?",
                'answer' => "{$title} is a remarkable " . strtolower($type) . " that centers around themes of drama, character growth, and narrative tension. It showcases the emotional journeys of its characters as they navigate challenging conflicts and obstacles."
            ],
            [
                'question' => "Who stars in {$title}?",
                'answer' => "The leading cast members in {$title} include {$castStr}. Their spectacular acting and on-screen chemistry have garnered praise from both Korean and international viewers."
            ],
            [
                'question' => "Who is the director of {$title}?",
                'answer' => "{$title} is directed by the talented {$directorStr}, who brings a unique visual style and narrative depth to the project."
            ],
            [
                'question' => "What genres does {$title} belong to?",
                'answer' => "{$title} is officially classified under the {$genresStr} genre categories, blending different narrative elements to appeal to a wide variety of fans."
            ],
            [
                'question' => "When was {$title} released?",
                'answer' => "This Korean entertainment masterpiece, {$title}, made its premiere in the year {$releaseYear}, drawing instant interest from drama lovers."
            ],
            [
                'question' => "Is {$title} worth watching?",
                'answer' => "Absolutely! {$title} is highly recommended. Between its stellar screenplay, emotional depth, and impressive ratings (ranking highly among community picks), it is a must-watch title on KSubZone."
            ],
            [
                'question' => "Where can I download subtitle files for {$title}?",
                'answer' => "You can find community-contributed and verified subtitle files (in SRT, VTT, and ASS formats) directly in the KSubZone Subtitle Center. Users frequently upload synchronized translations for this title."
            ],
            [
                'question' => "How many hours of content or runtime does {$title} have?",
                'answer' => "As a premium title, {$title} offers an immersive viewing experience. If it's a movie, it generally runs for a standard length, while TV dramas offer multiple episodes of deep storytelling."
            ],
            [
                'question' => "Who are the production studios behind {$title}?",
                'answer' => "The creation of {$title} involved leading production companies in South Korea, ensuring high-end cinematography, exceptional costume design, and a memorable soundtrack."
            ],
            [
                'question' => "Why should I use KSubZone to track subtitles for {$title}?",
                'answer' => "KSubZone provides episode guides, Sinhala and English community subtitles, detailed FAQ sheets, and premium dark UI options that make exploring titles like {$title} easier."
            ]
        ];
    }

    public static function generateSeoForTitle($title, $originalDescription = '', $type = 'Movie', $metadata = []) {
        $genres = $metadata['genres'] ?? [];
        $releaseDate = $metadata['releaseDate'] ?? null;
        $director = $metadata['director'] ?? '';
        $cast = $metadata['cast'] ?? [];

        $releaseYear = '2026';
        if ($releaseDate) {
            $time = strtotime($releaseDate);
            if ($time) {
                $releaseYear = date('Y', $time);
            }
        }

        $genresStr = implode(', ', $genres);
        $directorStr = $director ?: 'N/A';
        $castStr = implode(', ', array_slice($cast, 0, 3));

        $synopsisRewrite = "In a captivating narrative spin, \"{$title}\" presents a powerful storyline. " . ($originalDescription ?: "This production represents a key moment in modern Korean entertainment.") . " Fans of the genres will enjoy the distinct pacing, high production values, and the narrative threads woven together by the creative crew.";

        $storyOverview = "The plot of \"{$title}\" delves deeply into complex themes. Under the guidance of director {$directorStr}, the narrative avoids standard clichés to explore the psychological motives of its protagonists. The thematic backdrop of {$genresStr} elements adds a rich atmosphere to the entire run.";

        $castOverview = "The performance of \"{$title}\" is anchored by {$castStr}. The chemistry between the lead actors creates an intense atmosphere, making every dramatic encounter resonate with viewers. Critical reception has highlighted their versatility in these roles.";

        $seriesOverview = $type === 'Drama'
            ? "\"{$title}\" has established itself as a landmark TV Series. Composed of multiple seasons and episodes, the drama features structural storylines that keep audiences returning week after week."
            : "\"{$title}\" is a stand-alone cinematic movie. It delivers a concise, high-impact storytelling experience that leaves a lasting impression.";

        $metaTitle = "{$title} ({$releaseYear}) Sinhala & English Subtitles | KSubZone";
        $metaDescription = "Download {$title} ({$releaseYear}) Sinhala and English subtitles in SRT, VTT, or ASS format. Read comments, casting breakdowns, and the full storyline FAQs.";

        $aiSeoDescription = "KSubZone presents the ultimate analytical guide to {$title}. Explore directors, screenwriters, cast summaries, production company files, and SEO ratings.";

        $seoKeywords = [
            strtolower($title),
            strtolower($title) . " sinhala subtitles",
            strtolower($title) . " subtitles",
            strtolower($title) . " eng sub",
            "ksubzone " . strtolower($title),
            "korean entertainment",
            "ksubzone"
        ];
        foreach ($genres as $g) {
            $seoKeywords[] = strtolower($g);
        }

        $faq = self::generateFaqList($title, $type, $genres, $director, $cast, $releaseYear);

        $canonicalUrl = "https://www.ksubzone.com/" . strtolower($type) . "/" . preg_replace('/[^a-z0-9]+/i', '-', strtolower($title));

        if ($type === 'Movie') {
            $schemaMarkup = [
                "@context" => "https://schema.org",
                "@type" => "Movie",
                "name" => $title,
                "url" => $canonicalUrl,
                "description" => $originalDescription,
                "director" => [
                    "@type" => "Person",
                    "name" => $directorStr
                ],
                "genre" => $genres,
                "datePublished" => $releaseDate
            ];
        } else {
            $schemaMarkup = [
                "@context" => "https://schema.org",
                "@type" => "TVSeries",
                "name" => $title,
                "url" => $canonicalUrl,
                "description" => $originalDescription,
                "genre" => $genres,
                "startDate" => $releaseDate
            ];
        }

        return [
            'synopsisRewrite' => $synopsisRewrite,
            'storyOverview' => $storyOverview,
            'castOverview' => $castOverview,
            'seriesOverview' => $seriesOverview,
            'metaTitle' => $metaTitle,
            'metaDescription' => $metaDescription,
            'aiSeoDescription' => $aiSeoDescription,
            'seoKeywords' => $seoKeywords,
            'faq' => $faq,
            'schemaMarkup' => $schemaMarkup
        ];
    }

    public static function generateManualSeo() {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $title = $body['title'] ?? '';
        if (empty($title)) {
            http_response_code(400);
            echo json_encode(['message' => 'Title is required']);
            return;
        }

        $seoPack = self::generateSeoForTitle($title, $body['description'] ?? '', $body['type'] ?? 'Movie', [
            'genres' => $body['genres'] ?? [],
            'releaseDate' => $body['releaseDate'] ?? null,
            'director' => $body['director'] ?? '',
            'cast' => $body['cast'] ?? []
        ]);

        header('Content-Type: application/json');
        echo json_encode($seoPack);
    }
}
