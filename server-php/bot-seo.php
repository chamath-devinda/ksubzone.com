<?php
// bot-seo.php
// Intercepts social media bots (WhatsApp, Facebook, Twitter, etc.)
// and serves them dynamically generated meta tags for accurate link previews.

ini_set('display_errors', 0);
error_reporting(E_ALL);

// Base HTML
$indexPath = __DIR__ . '/../client/dist/index.html';
if (!file_exists($indexPath)) {
    $indexPath = __DIR__ . '/../client/index.html';
}

$html = file_exists($indexPath) ? file_get_contents($indexPath) : '<!DOCTYPE html><html><head><title>KSubZone</title></head><body></body></html>';

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

$isGenrePage = false;
$isCategoryPage = false;
$isHubPage = false;
$genreType = '';
$genreSlug = '';
$categorySlug = '';
$hubType = '';

if (preg_match('#^/(drama|movie)/genre/([a-z0-9-]+)#i', $uri, $genreMatches)) {
    $isGenrePage = true;
    $genreType = strtolower($genreMatches[1]);
    $genreSlug = $genreMatches[2];
} elseif (preg_match('#^/articles/category/([a-z0-9-]+)#i', $uri, $categoryMatches)) {
    $isCategoryPage = true;
    $categorySlug = $categoryMatches[1];
} elseif (preg_match('#^/(articles|dramas|movies|search)/?$#i', $uri, $hubMatches)) {
    $isHubPage = true;
    $hubType = strtolower($hubMatches[1]);
}

$isMediaOrArticle = preg_match('#^/(watch|drama|movie|articles)/([a-z0-9-]+)#i', $uri, $matches);

if ($isGenrePage || $isCategoryPage || $isMediaOrArticle || $isHubPage) {
    if ($isMediaOrArticle) {
        $routeType = strtolower($matches[1]);
        $slug = $matches[2];
    }
    
    // Bootstrap DB
    spl_autoload_register(function ($class) {
        $classPath = str_replace('\\', '/', $class);
        $parts = explode('/', $classPath);
        if (count($parts) > 1) {
            $parts[0] = strtolower($parts[0]);
        }
        $classPath = implode('/', $parts);
        $file = __DIR__ . '/' . $classPath . '.php';
        if (file_exists($file)) require_once $file;
    });
    
    try {
        // Load environment variables for database credentials
        if (file_exists(__DIR__ . '/.env')) {
            \Utils\Dotenv::load(__DIR__ . '/.env');
        }

        $db = \Config\Database::getInstance();
        $media = null;
        $title = '';
        $desc = '';
        $image = '';
        $isMovie = false;
        $isEpisodePage = false;
        $seasonNumber = null;
        $episodeNumber = null;
        $episode = null;
        $episodeSchema = null;
        $breadcrumbs = null;
        $itemListSchema = null;
        $rawDesc = '';

        if ($isGenrePage) {
            // 1. Resolve genre slug to proper TMDB genre name
            $genreObj = $db->findOne('genres', ['slug' => $genreSlug]);
            $genreName = $genreObj ? $genreObj['name'] : ucwords(str_replace('-', ' ', $genreSlug));

            // 2. Fetch movies or dramas belonging to this genre
            $collection = ($genreType === 'movie') ? 'movies' : 'dramas';
            $items = $db->find($collection, [
                'status' => 'Published',
                'keywords' => ['$in' => [$genreName]]
            ]);

            // 3. Set metadata
            $title = htmlspecialchars("Best {$genreName} Korean " . ($genreType === 'movie' ? 'Movies' : 'Dramas') . " (Sinhala Subtitles) | KSubZone");
            $rawDesc = "Download Sinhala and English subtitles for the best {$genreName} Korean " . ($genreType === 'movie' ? 'movies' : 'dramas') . " on KSubZone. Explore full cast, summaries, and subtitle files.";
            $desc = htmlspecialchars($rawDesc);
            $image = 'https://www.ksubzone.com/assets/default-share.jpg';

            // 4. Set schemas
            $itemListElements = [];
            $idx = 1;
            foreach ($items as $item) {
                $itemSlug = \Utils\Slug::normalizePermalinkSlug($item['slug'] ?? '');
                $itemUrl = "https://www.ksubzone.com/{$genreType}/" . $itemSlug;
                $itemListElements[] = [
                    "@type" => "ListItem",
                    "position" => $idx++,
                    "url" => $itemUrl,
                    "name" => $item['title'] ?? ''
                ];
            }
            $itemListSchema = [
                "@context" => "https://schema.org",
                "@type" => "ItemList",
                "name" => "{$genreName} " . ($genreType === 'movie' ? 'Movies' : 'Dramas'),
                "itemListElement" => $itemListElements
            ];

            $breadcrumbs = [
                "@context" => "https://schema.org",
                "@type" => "BreadcrumbList",
                "itemListElement" => [
                    [
                        "@type" => "ListItem",
                        "position" => 1,
                        "name" => "KSubZone",
                        "item" => "https://www.ksubzone.com"
                    ],
                    [
                        "@type" => "ListItem",
                        "position" => 2,
                        "name" => $genreType === 'movie' ? "Movies" : "Dramas",
                        "item" => "https://www.ksubzone.com/" . ($genreType === 'movie' ? "movies" : "dramas")
                    ],
                    [
                        "@type" => "ListItem",
                        "position" => 3,
                        "name" => $genreName,
                        "item" => "https://www.ksubzone.com/{$genreType}/genre/{$genreSlug}"
                    ]
                ]
            ];

            // 5. Build fallback HTML
            $fallbackHtml = "<h1>{$title}</h1>\n<p>{$rawDesc}</p>\n<ul>\n";
            foreach ($items as $item) {
                $itemSlug = \Utils\Slug::normalizePermalinkSlug($item['slug'] ?? '');
                $itemUrl = "https://www.ksubzone.com/{$genreType}/" . $itemSlug;
                $fallbackHtml .= "  <li><a href=\"{$itemUrl}\">" . htmlspecialchars($item['title'] ?? '') . "</a> - " . htmlspecialchars($item['metaDescription'] ?? $item['description'] ?? '') . "</li>\n";
            }
            $fallbackHtml .= "</ul>";

            $media = ['_id' => 'genre-page']; // dummy object to trigger HTML injection
        } elseif ($isCategoryPage) {
            // 1. Resolve category name dynamically
            $categoryName = ucwords(str_replace('-', ' ', $categorySlug));
            $articlesList = $db->find('articles', ['status' => 'Published']);
            foreach ($articlesList as $art) {
                if (!empty($art['category']) && \Utils\Slug::slugify($art['category']) === $categorySlug) {
                    $categoryName = $art['category'];
                    break;
                }
            }

            // 2. Fetch articles
            $items = $db->find('articles', [
                'status' => 'Published',
                'category' => $categoryName
            ]);

            // 3. Set metadata
            $title = htmlspecialchars("K-Drama {$categoryName} Articles & Guides | KSubZone");
            $rawDesc = "Read K-drama {$categoryName} articles, reviews, character guides, and Sinhala subtitle watch notes on KSubZone.";
            $desc = htmlspecialchars($rawDesc);
            $image = 'https://www.ksubzone.com/assets/default-share.jpg';

            // 4. Set schemas
            $itemListElements = [];
            $idx = 1;
            foreach ($items as $item) {
                $itemUrl = "https://www.ksubzone.com/articles/" . htmlspecialchars($item['slug'] ?? '');
                $itemListElements[] = [
                    "@type" => "ListItem",
                    "position" => $idx++,
                    "url" => $itemUrl,
                    "name" => $item['title'] ?? ''
                ];
            }
            $itemListSchema = [
                "@context" => "https://schema.org",
                "@type" => "ItemList",
                "name" => "{$categoryName} Articles",
                "itemListElement" => $itemListElements
            ];

            $breadcrumbs = [
                "@context" => "https://schema.org",
                "@type" => "BreadcrumbList",
                "itemListElement" => [
                    [
                        "@type" => "ListItem",
                        "position" => 1,
                        "name" => "KSubZone",
                        "item" => "https://www.ksubzone.com"
                    ],
                    [
                        "@type" => "ListItem",
                        "position" => 2,
                        "name" => "Articles",
                        "item" => "https://www.ksubzone.com/articles"
                    ],
                    [
                        "@type" => "ListItem",
                        "position" => 3,
                        "name" => $categoryName,
                        "item" => "https://www.ksubzone.com/articles/category/{$categorySlug}"
                    ]
                ]
            ];

            // 5. Build fallback HTML
            $fallbackHtml = "<h1>{$title}</h1>\n<p>{$rawDesc}</p>\n<ul>\n";
            foreach ($items as $item) {
                $itemUrl = "https://www.ksubzone.com/articles/" . htmlspecialchars($item['slug'] ?? '');
                $fallbackHtml .= "  <li><a href=\"{$itemUrl}\">" . htmlspecialchars($item['title'] ?? '') . "</a> - " . htmlspecialchars($item['metaDescription'] ?? $item['excerpt'] ?? '') . "</li>\n";
            }
            $fallbackHtml .= "</ul>";

            $media = ['_id' => 'category-page']; // dummy object to trigger HTML injection
        } elseif ($isHubPage) {
            $items = [];
            if ($hubType === 'articles') {
                $items = $db->find('articles', ['status' => 'Published']);
                $title = htmlspecialchars("K-Drama & Movie Articles, Guides & Reviews | KSubZone");
                $rawDesc = "Read the latest Korean drama reviews, guides, character studies, Sinhala subtitle notes, and movie recommendations on KSubZone.";
            } elseif ($hubType === 'dramas') {
                $items = $db->find('dramas', ['status' => 'Published']);
                $title = htmlspecialchars("Latest Korean TV Series & Dramas with Sinhala Subtitles | KSubZone");
                $rawDesc = "Browse and download Sinhala and English subtitles for the latest Korean TV shows and dramas. Find episode guides and casting details on KSubZone.";
            } elseif ($hubType === 'movies') {
                $items = $db->find('movies', ['status' => 'Published']);
                $title = htmlspecialchars("Korean Movies with Sinhala Subtitles | KSubZone");
                $rawDesc = "Browse and download Sinhala and English subtitles for Korean films. Search movie synopsis, reviews, and high-quality subtitle files on KSubZone.";
            } elseif ($hubType === 'search') {
                $dramas = $db->find('dramas', ['status' => 'Published'], ['limit' => 50]);
                $movies = $db->find('movies', ['status' => 'Published'], ['limit' => 50]);
                $items = array_merge($dramas, $movies);
                $title = htmlspecialchars("Search K-Dramas & Movies | KSubZone Subtitle Catalog");
                $rawDesc = "Search the KSubZone catalog for Korean dramas, TV shows, and movies with Sinhala subtitles. Find high-quality subtitles easily.";
            }

            $desc = htmlspecialchars($rawDesc);
            $image = 'https://www.ksubzone.com/assets/default-share.jpg';

            // 4. Set schemas
            $itemListElements = [];
            $idx = 1;
            foreach ($items as $item) {
                if ($hubType === 'articles') {
                    $itemUrl = "https://www.ksubzone.com/articles/" . htmlspecialchars($item['slug'] ?? '');
                } else {
                    $itemType = isset($item['runtime']) ? 'movie' : 'drama';
                    $itemSlug = \Utils\Slug::normalizePermalinkSlug($item['slug'] ?? '');
                    $itemUrl = "https://www.ksubzone.com/{$itemType}/" . $itemSlug;
                }
                $itemListElements[] = [
                    "@type" => "ListItem",
                    "position" => $idx++,
                    "url" => $itemUrl,
                    "name" => $item['title'] ?? ''
                ];
            }
            $itemListSchema = [
                "@context" => "https://schema.org",
                "@type" => "ItemList",
                "name" => "{$hubType} catalog",
                "itemListElement" => $itemListElements
            ];

            $breadcrumbs = [
                "@context" => "https://schema.org",
                "@type" => "BreadcrumbList",
                "itemListElement" => [
                    [
                        "@type" => "ListItem",
                        "position" => 1,
                        "name" => "KSubZone",
                        "item" => "https://www.ksubzone.com"
                    ],
                    [
                        "@type" => "ListItem",
                        "position" => 2,
                        "name" => ucwords($hubType),
                        "item" => "https://www.ksubzone.com/{$hubType}"
                    ]
                ]
            ];

            // 5. Build fallback HTML
            $fallbackHtml = "<h1>{$title}</h1>\n<p>{$rawDesc}</p>\n<ul>\n";
            foreach ($items as $item) {
                if ($hubType === 'articles') {
                    $itemUrl = "https://www.ksubzone.com/articles/" . htmlspecialchars($item['slug'] ?? '');
                    $fallbackHtml .= "  <li><a href=\"{$itemUrl}\">" . htmlspecialchars($item['title'] ?? '') . "</a> - " . htmlspecialchars($item['metaDescription'] ?? $item['excerpt'] ?? '') . "</li>\n";
                } else {
                    $itemType = isset($item['runtime']) ? 'movie' : 'drama';
                    $itemSlug = \Utils\Slug::normalizePermalinkSlug($item['slug'] ?? '');
                    $itemUrl = "https://www.ksubzone.com/{$itemType}/" . $itemSlug;
                    $fallbackHtml .= "  <li><a href=\"{$itemUrl}\">" . htmlspecialchars($item['title'] ?? '') . "</a> - " . htmlspecialchars($item['metaDescription'] ?? $item['description'] ?? '') . "</li>\n";
                }
            }
            $fallbackHtml .= "</ul>";

            $media = ['_id' => 'hub-page']; // dummy object to trigger HTML injection
        } else {
            if ($routeType === 'articles') {
                $article = $db->findOne('articles', ['slug' => $slug]);
                if ($article) {
                    $title = htmlspecialchars($article['metaTitle'] ?: ($article['title'] . ' - KSubZone'));
                    $rawDesc = $article['metaDescription'] ?: $article['excerpt'] ?: strip_tags($article['content'] ?? '');
                    $desc = htmlspecialchars(mb_substr($rawDesc, 0, 160) . (mb_strlen($rawDesc) > 160 ? '...' : ''));
                    $image = htmlspecialchars($article['coverImage'] ?: 'https://www.ksubzone.com/assets/default-share.jpg');
                    $media = $article;
                }
            } else {
                if (($routeType === 'drama' || $routeType === 'watch') && preg_match('#/season-([0-9]+)/episode-([0-9]+)#i', $uri, $epMatches)) {
                    $isEpisodePage = true;
                    $seasonNumber = (int)$epMatches[1];
                    $episodeNumber = (int)$epMatches[2];
                }

                $media = $db->findOne('dramas', ['slug' => $slug]);
                if (!$media) {
                    $media = $db->findOne('movies', ['slug' => $slug]);
                    $isMovie = true;
                }
                
                if ($media) {
                    if ($isEpisodePage && !$isMovie) {
                        $season = $db->findOne('seasons', ['dramaId' => $media['_id'], 'seasonNumber' => $seasonNumber]);
                        if ($season) {
                            $episode = $db->findOne('episodes', [
                                'dramaId' => $media['_id'],
                                'seasonId' => $season['_id'],
                                'episodeNumber' => $episodeNumber
                            ]);
                        }
                        
                        if ($episode) {
                            $title = htmlspecialchars($media['title'] . ' S' . sprintf('%02d', $seasonNumber) . 'E' . sprintf('%02d', $episodeNumber) . (!empty($episode['episodeTitle']) ? ' "' . $episode['episodeTitle'] . '"' : '') . ' Sinhala Subtitles | KSubZone');
                            $rawDesc = $episode['episodeDescription'] ?: 'Download Sinhala and English subtitles for ' . $media['title'] . ' S' . sprintf('%02d', $seasonNumber) . 'E' . sprintf('%02d', $episodeNumber) . '.';
                            $desc = htmlspecialchars(mb_substr($rawDesc, 0, 160) . (mb_strlen($rawDesc) > 160 ? '...' : ''));
                            $image = htmlspecialchars($episode['episodeThumbnail'] ?: $media['posterPath'] ?: $media['backdropPath'] ?: 'https://www.ksubzone.com/assets/default-share.jpg');
                            
                            $episodeSchema = $episode['episodeSchemaMarkup'] ?? null;
                            if (empty($episodeSchema) || !is_array($episodeSchema)) {
                                $episodeSchema = [
                                    "@context" => "https://schema.org",
                                    "@type" => "TVEpisode",
                                    "name" => $episode['episodeTitle'] ?: "Episode " . $episodeNumber,
                                    "episodeNumber" => $episodeNumber,
                                    "description" => $rawDesc,
                                    "datePublished" => $episode['airDate'] ?? null,
                                    "partOfSeason" => [
                                        "@type" => "TVSeason",
                                        "seasonNumber" => $seasonNumber
                                    ],
                                    "partOfSeries" => [
                                        "@type" => "TVSeries",
                                        "name" => $media['title'],
                                        "sameAs" => "https://www.ksubzone.com/drama/" . $media['slug']
                                    ]
                                ];
                            }
                        } else {
                            $title = htmlspecialchars($media['metaTitle'] ?? ($media['title'] . ' - KSubZone'));
                            $rawDesc = $media['metaDescription'] ?? $media['synopsis'] ?? 'Watch ' . $media['title'] . ' on KSubZone with synchronized multi-language subtitles.';
                            $desc = htmlspecialchars(mb_substr($rawDesc, 0, 160) . (mb_strlen($rawDesc) > 160 ? '...' : ''));
                            $image = htmlspecialchars($media['posterPath'] ?? $media['backdropPath'] ?? 'https://www.ksubzone.com/assets/default-share.jpg');
                        }
                    } else {
                        $title = htmlspecialchars($media['metaTitle'] ?? ($media['title'] . ' - KSubZone'));
                        $rawDesc = $media['metaDescription'] ?? $media['synopsis'] ?? 'Watch ' . $media['title'] . ' on KSubZone with synchronized multi-language subtitles.';
                        $desc = htmlspecialchars(mb_substr($rawDesc, 0, 160) . (mb_strlen($rawDesc) > 160 ? '...' : ''));
                        $image = htmlspecialchars($media['posterPath'] ?? $media['backdropPath'] ?? 'https://www.ksubzone.com/assets/default-share.jpg');
                    }
                }
            }
        }

        // Build BreadcrumbList Schema
        if ($media && !$isGenrePage && !$isCategoryPage) {
            $listElements = [
                [
                    "@type" => "ListItem",
                    "position" => 1,
                    "name" => "KSubZone",
                    "item" => "https://www.ksubzone.com"
                ]
            ];
            
            if ($routeType === 'articles') {
                $listElements[] = [
                    "@type" => "ListItem",
                    "position" => 2,
                    "name" => "Articles",
                    "item" => "https://www.ksubzone.com/articles"
                ];
                $listElements[] = [
                    "@type" => "ListItem",
                    "position" => 3,
                    "name" => $media['title'],
                    "item" => "https://www.ksubzone.com/articles/" . $media['slug']
                ];
            } else if ($isMovie) {
                $listElements[] = [
                    "@type" => "ListItem",
                    "position" => 2,
                    "name" => "Movies",
                    "item" => "https://www.ksubzone.com/movies"
                ];
                $listElements[] = [
                    "@type" => "ListItem",
                    "position" => 3,
                    "name" => $media['title'],
                    "item" => "https://www.ksubzone.com/movie/" . $media['slug']
                ];
            } else {
                $listElements[] = [
                    "@type" => "ListItem",
                    "position" => 2,
                    "name" => "Dramas",
                    "item" => "https://www.ksubzone.com/dramas"
                ];
                $listElements[] = [
                    "@type" => "ListItem",
                    "position" => 3,
                    "name" => $media['title'],
                    "item" => "https://www.ksubzone.com/drama/" . $media['slug']
                ];
                
                if ($isEpisodePage && $episode) {
                    $listElements[] = [
                        "@type" => "ListItem",
                        "position" => 4,
                        "name" => "Season " . $seasonNumber,
                        "item" => "https://www.ksubzone.com/drama/" . $media['slug'] . "/season-" . $seasonNumber
                    ];
                    $listElements[] = [
                        "@type" => "ListItem",
                        "position" => 5,
                        "name" => "Episode " . $episodeNumber,
                        "item" => "https://www.ksubzone.com/drama/" . $media['slug'] . "/season-" . $seasonNumber . "/episode-" . $episodeNumber
                    ];
                }
            }
            
            $breadcrumbs = [
                "@context" => "https://schema.org",
                "@type" => "BreadcrumbList",
                "itemListElement" => $listElements
            ];
        }
        
        if ($media) {
            // Check if image is relative path, convert to absolute
            if (strpos($image, 'http') !== 0) {
                $image = 'https://www.ksubzone.com' . (strpos($image, '/') === 0 ? '' : '/') . $image;
            }

            // Replace meta tags in HTML (supporting self-closing tags with whitespace like />)
            $html = preg_replace('/<title>.*?<\/title>/is', "<title>$title</title>", $html);
            $html = preg_replace('/<meta\s+name="description"\s+content=".*?"\s*\/?>/is', '<meta name="description" content="'.$desc.'" />', $html);
            $html = preg_replace('/<meta\s+name="title"\s+content=".*?"\s*\/?>/is', '<meta name="title" content="'.$title.'" />', $html);
            
            $html = preg_replace('/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/is', '<meta property="og:title" content="'.$title.'" />', $html);
            $html = preg_replace('/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/is', '<meta property="og:description" content="'.$desc.'" />', $html);
            $html = preg_replace('/<meta\s+property="og:image"\s+content=".*?"\s*\/?>/is', '<meta property="og:image" content="'.$image.'" />', $html);
            
            $html = preg_replace('/<meta\s+property="twitter:title"\s+content=".*?"\s*\/?>/is', '<meta property="twitter:title" content="'.$title.'" />', $html);
            $html = preg_replace('/<meta\s+property="twitter:description"\s+content=".*?"\s*\/?>/is', '<meta property="twitter:description" content="'.$desc.'" />', $html);
            $html = preg_replace('/<meta\s+property="twitter:image"\s+content=".*?"\s*\/?>/is', '<meta property="twitter:image" content="'.$image.'" />', $html);

            // Add canonical tag
            $canonicalUrl = 'https://www.ksubzone.com' . $uri;
            $html = preg_replace('/<\/head>/i', '<link rel="canonical" href="' . htmlspecialchars($canonicalUrl) . '" />' . "\n</head>", $html);

            // Inject TVEpisode schema for episode page, otherwise inject main media schema (Movie / TVSeries) or ItemList schema
            if (!empty($episodeSchema)) {
                $epSchemaScript = '<script type="application/ld+json">' . json_encode($episodeSchema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>';
                $html = preg_replace('/<\/head>/i', $epSchemaScript . "\n</head>", $html);
            } else if (!empty($itemListSchema)) {
                $itemSchemaScript = '<script type="application/ld+json">' . json_encode($itemListSchema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>';
                $html = preg_replace('/<\/head>/i', $itemSchemaScript . "\n</head>", $html);
            } else if (!empty($media['schemaMarkup']) && is_array($media['schemaMarkup'])) {
                $mainSchema = json_encode($media['schemaMarkup'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                $mainSchemaScript = '<script type="application/ld+json">' . $mainSchema . '</script>';
                $html = preg_replace('/<\/head>/i', $mainSchemaScript . "\n</head>", $html);
            }

            // Inject BreadcrumbList schema
            if (!empty($breadcrumbs)) {
                $bcScript = '<script type="application/ld+json">' . json_encode($breadcrumbs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>';
                $html = preg_replace('/<\/head>/i', $bcScript . "\n</head>", $html);
            }

            // Inject FAQPage schema for Googlebot so FAQ rich results appear in Google Search.
            // The faq array is populated by AiSeoController::generateFaqList() when AI SEO is run.
            if (!empty($media['faq']) && is_array($media['faq'])) {
                $faqEntities = [];
                foreach ($media['faq'] as $item) {
                    $question = htmlspecialchars_decode($item['question'] ?? '', ENT_QUOTES);
                    $answer   = htmlspecialchars_decode($item['answer']   ?? '', ENT_QUOTES);
                    if (empty($question) || empty($answer)) continue;
                    $faqEntities[] = [
                        '@type'          => 'Question',
                        'name'           => $question,
                        'acceptedAnswer' => [
                            '@type' => 'Answer',
                            'text'  => $answer
                        ]
                    ];
                }

                if (!empty($faqEntities)) {
                    $faqSchema = [
                        '@context'   => 'https://schema.org',
                        '@type'      => 'FAQPage',
                        'mainEntity' => $faqEntities
                    ];
                    $faqScript = '<script type="application/ld+json">'
                        . json_encode($faqSchema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                        . '</script>';
                    $html = preg_replace('/<\/head>/i', $faqScript . "\n</head>", $html);
                }
            }

            if (!$isGenrePage && !$isCategoryPage) {
                // Create fallback visible content for search indexing bots
                $fallbackHtml = "<h1>{$title}</h1>\n<p>{$rawDesc}</p>";
                if (!empty($media['posterPath'] ?? '')) {
                    $fallbackHtml .= "\n<img src=\"" . htmlspecialchars($media['posterPath']) . "\" alt=\"" . htmlspecialchars($media['title'] ?? '') . "\" />";
                }
                if ($routeType === 'articles') {
                    $fallbackHtml .= "\n<div>" . ($media['content'] ?? '') . "</div>";
                }
            }
            
            // Inject fallback visible HTML in the container for non-JS / crawler indexing
            $html = preg_replace('/<div id="root"><\/div>/is', '<div id="root">' . $fallbackHtml . '</div>', $html);
        }
    } catch (\Exception $e) {
        // Silently fail and serve default HTML for bots if DB error
    }
}

echo $html;
exit;
