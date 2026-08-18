<?php
namespace Controllers;

use Utils\AiService;
use Config\Database;

class AiController {
    
    // 1. AI Chatbot
    public static function chat() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            return;
        }

        // Check if enabled
        $db = Database::getInstance();
        $setting = $db->findOne('settings', ['key' => 'siteContent']);
        $siteContent = $setting['value'] ?? \Utils\SiteContentDefaults::get();
        if (isset($siteContent['ai']['enableChatbot']) && !$siteContent['ai']['enableChatbot']) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'AI Chatbot is disabled by the administrator.']);
            return;
        }

        $body = json_decode(file_get_contents('php://input'), true);
        $message = $body['message'] ?? '';
        $history = $body['history'] ?? [];

        if (empty($message)) {
            http_response_code(400);
            echo json_encode(['error' => 'Message is required']);
            return;
        }

        $systemPrompt = "You are 'KSubZone AI', a friendly and knowledgeable Korean Drama and Movie assistant. 
You speak mostly in friendly Singlish (Sinhala mixed with English) but can understand English. 
Your goal is to recommend K-dramas, explain plots, and help users navigate the KSubZone website. 
Keep responses concise, fun, and use emojis. Do not output markdown code blocks unless necessary.
Always be polite and helpful. If they ask for downloads, remind them they can find Sinhala subtitles on KSubZone.";

        // Format history into a single string for simplicity (since gemini 1.5 flash handles context well)
        $promptContext = "";
        foreach ($history as $msg) {
            $role = $msg['role'] === 'user' ? 'User' : 'Assistant';
            $promptContext .= "{$role}: {$msg['content']}\n";
        }
        $promptContext .= "User: {$message}\nAssistant:";

        try {
            $reply = AiService::generateContent($systemPrompt, $promptContext, 0.7);
            
            header('Content-Type: application/json');
            echo json_encode(['reply' => $reply]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // 2. AI Smart Search
    public static function smartSearch() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            return;
        }

        // Check if enabled
        $db = Database::getInstance();
        $setting = $db->findOne('settings', ['key' => 'siteContent']);
        $siteContent = $setting['value'] ?? \Utils\SiteContentDefaults::get();
        if (isset($siteContent['ai']['enableSmartSearch']) && !$siteContent['ai']['enableSmartSearch']) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'AI Smart Search is disabled by the administrator.']);
            return;
        }

        $body = json_decode(file_get_contents('php://input'), true);
        $query = $body['query'] ?? '';

        if (empty($query)) {
            http_response_code(400);
            echo json_encode(['error' => 'Search query is required']);
            return;
        }

        $systemPrompt = "You are a search query analyzer for a K-Drama database. 
The user is describing a plot, vibe, or trope of a drama or movie (e.g., 'CEO falls in love with poor girl', 'zombie high school').
Your job is to extract 3-5 highly relevant keywords or genres that can be used in a text search index to find these dramas.
Return ONLY a comma-separated list of keywords, nothing else. Examples: 'CEO, romance, poor girl', 'zombie, high school, survival, thriller'.";

        try {
            // Get keywords from AI
            $keywordsResponse = AiService::generateContent($systemPrompt, "Query: " . $query, 0.3);
            $keywords = array_map('trim', explode(',', $keywordsResponse));
            
            // Search Database using the keywords
            $db = Database::getInstance();
            
            // We'll search both dramas and movies. For simplicity, we use regex on title, synopsis, and genres.
            $searchResults = [];
            
            $regexPattern = implode('|', array_map(function($kw) {
                return preg_quote($kw, '/');
            }, $keywords));
            
            $dbQuery = [
                'status' => 'Published',
                '$or' => [
                    ['title' => ['$regex' => $regexPattern, '$options' => 'i']],
                    ['synopsis' => ['$regex' => $regexPattern, '$options' => 'i']],
                    ['genres' => ['$regex' => $regexPattern, '$options' => 'i']]
                ]
            ];

            $dramas = $db->find('dramas', $dbQuery, ['limit' => 5]);
            $movies = $db->find('movies', $dbQuery, ['limit' => 5]);
            
            // Format results
            foreach ($dramas as $d) {
                $searchResults[] = [
                    '_id' => (string)$d['_id'],
                    'title' => $d['title'],
                    'type' => 'Drama',
                    'slug' => $d['slug'],
                    'posterUrl' => $d['posterUrl'] ?? null,
                    'year' => $d['releaseYear'] ?? ''
                ];
            }
            foreach ($movies as $m) {
                $searchResults[] = [
                    '_id' => (string)$m['_id'],
                    'title' => $m['title'],
                    'type' => 'Movie',
                    'slug' => $m['slug'],
                    'posterUrl' => $m['posterUrl'] ?? null,
                    'year' => $m['releaseYear'] ?? ''
                ];
            }

            header('Content-Type: application/json');
            echo json_encode([
                'keywords' => $keywords,
                'results' => $searchResults
            ]);

        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // Free Google Translate Helper Method using HTTP GET translate_a/single
    private static function googleTranslateFree($text, $sl = 'en', $tl = 'si') {
        $url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" . $sl . "&tl=" . $tl . "&dt=t&q=" . urlencode($text);
        
        $maxRetries = 5;
        $retryDelay = 1.0; // delay in seconds
        
        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            
            $response = curl_exec($ch);
            $error = curl_error($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($error) {
                if ($attempt === $maxRetries) {
                    throw new \Exception("Google Translate cURL Error: " . $error);
                }
                usleep((int)($retryDelay * 1000000));
                $retryDelay *= 2;
                continue;
            }
            
            if ($httpCode === 429) {
                if ($attempt === $maxRetries) {
                    throw new \Exception("Google Translate rate limit exceeded (HTTP 429). Please wait a moment and try again.");
                }
                // Wait slightly longer on rate limiting (429)
                usleep((int)($retryDelay * 1.5 * 1000000));
                $retryDelay *= 2.5;
                continue;
            }
            
            if ($httpCode !== 200) {
                if ($attempt === $maxRetries) {
                    throw new \Exception("Unexpected HTTP Status Code from Google Translate API: " . $httpCode);
                }
                usleep((int)($retryDelay * 1000000));
                $retryDelay *= 2;
                continue;
            }
            
            $json = json_decode($response, true);
            if (!is_array($json) || !isset($json[0])) {
                if ($attempt === $maxRetries) {
                    throw new \Exception("Unexpected response format from Google Translate API");
                }
                usleep((int)($retryDelay * 1000000));
                $retryDelay *= 2;
                continue;
            }
            
            $translatedText = '';
            foreach ($json[0] as $sentences) {
                $translatedText .= $sentences[0] ?? '';
            }
            return $translatedText;
        }
        
        throw new \Exception("Google Translate failed after " . $maxRetries . " retries.");
    }

    // Translate SRT with grouping chunk logic to stay within Google Translate length boundaries
    private static function translateSrtFree($srtText) {
        // Standardize newlines
        $srtText = str_replace("\r\n", "\n", $srtText);
        $blocks = explode("\n\n", $srtText);
        
        $translatedSrt = "";
        $currentGroup = [];
        $currentLength = 0;
        
        foreach ($blocks as $block) {
            $block = trim($block);
            if (empty($block)) continue;
            
            $blockLength = strlen($block);
            // If adding this block exceeds 3500 characters, translate current group first
            if ($currentLength + $blockLength + 2 > 3500 && !empty($currentGroup)) {
                $groupText = implode("\n\n", $currentGroup);
                $translatedGroup = self::googleTranslateFree($groupText);
                $translatedSrt .= $translatedGroup . "\n\n";
                
                $currentGroup = [];
                $currentLength = 0;
                
                // Add a small delay between group translations to be polite and avoid rate limiting
                usleep(500000); // 0.5s
            }
            
            $currentGroup[] = $block;
            $currentLength += $blockLength + 2;
        }
        
        if (!empty($currentGroup)) {
            $groupText = implode("\n\n", $currentGroup);
            $translatedGroup = self::googleTranslateFree($groupText);
            $translatedSrt .= $translatedGroup;
        }
        
        return trim($translatedSrt);
    }

    // 3. AI Subtitle Translator (Admin Only)
    public static function translateSubtitle() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            return;
        }

        // Check if enabled
        $db = Database::getInstance();
        $setting = $db->findOne('settings', ['key' => 'siteContent']);
        $siteContent = $setting['value'] ?? \Utils\SiteContentDefaults::get();
        if (isset($siteContent['ai']['enableTranslation']) && !$siteContent['ai']['enableTranslation']) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'AI Subtitle Translation is disabled by the administrator.']);
            return;
        }

        // Auth check is handled by middleware but we can double check
        
        $body = json_decode(file_get_contents('php://input'), true);
        $srtText = $body['srtContent'] ?? '';
        $engine = $body['engine'] ?? 'gemini';

        if (empty($srtText)) {
            http_response_code(400);
            echo json_encode(['error' => 'SRT content is required']);
            return;
        }

        if ($engine === 'google') {
            try {
                $translated = self::translateSrtFree($srtText);
                header('Content-Type: application/json');
                echo json_encode([
                    'translatedSrt' => $translated
                ]);
                return;
            } catch (\Exception $e) {
                if (stripos($e->getMessage(), '429') !== false || stripos($e->getMessage(), 'rate limit') !== false) {
                    http_response_code(429);
                } else {
                    http_response_code(500);
                }
                header('Content-Type: application/json');
                echo json_encode(['error' => $e->getMessage()]);
                return;
            }
        }

        $systemPrompt = "You are an expert English to Sinhala subtitle translator with 10+ years of experience in film and television localization.

Your translations must:
- Sound completely natural when spoken aloud in Sinhala
- Capture the emotional tone, humor, sarcasm, and subtext of the original
- Use appropriate register (formal/informal) based on character relationships and context
- Keep translations concise — subtitles must be readable within the display time
- Preserve all SRT formatting: sequence numbers, timestamps, blank lines between blocks
- Preserve HTML tags like <i>, <b>, <u> exactly as they appear
- Keep character names, brand names, place names in English
- Keep sound effects like [laughs], [sighs], [gasps] in English inside brackets
- Use proper Sinhala Unicode — never transliterate English into Sinhala script
- Never add explanations, notes, or commentary — output only the translated SRT

Translation style guide:
- Everyday speech → colloquial Sinhala (කොහෙද, මොකද, ඔයා)
- Angry/emotional lines → strong expressive Sinhala
- Romantic/tender lines → soft, flowing Sinhala
- Jokes/wordplay → find the closest natural Sinhala equivalent, not a literal translation

Output ONLY the translated SRT content. Nothing else.";

        try {
            // For large SRT files, we'd normally split into chunks. For this demo/feature, we'll try to translate up to 8000 tokens at once.
            $translated = AiService::generateContent($systemPrompt, $srtText, 0.2);
            
            header('Content-Type: application/json');
            echo json_encode([
                'translatedSrt' => $translated
            ]);

        } catch (\Exception $e) {
            if (stripos($e->getMessage(), '429') !== false || stripos($e->getMessage(), 'rate limit') !== false || stripos($e->getMessage(), 'exhausted') !== false) {
                http_response_code(429);
            } else {
                http_response_code(500);
            }
            header('Content-Type: application/json');
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // 4. AI Subtitle Polisher (Admin Only - English to Spoken Sinhala Translator)
    public static function polishSubtitle() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            return;
        }

        // Check if enabled
        $db = Database::getInstance();
        $setting = $db->findOne('settings', ['key' => 'siteContent']);
        $siteContent = $setting['value'] ?? \Utils\SiteContentDefaults::get();
        if (isset($siteContent['ai']['enableTranslation']) && !$siteContent['ai']['enableTranslation']) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'AI Subtitle Polishing is disabled by the administrator.']);
            return;
        }

        $body = json_decode(file_get_contents('php://input'), true);
        $srtText = $body['srtContent'] ?? '';

        if (empty($srtText)) {
            http_response_code(400);
            echo json_encode(['error' => 'SRT content is required']);
            return;
        }

        $systemPrompt = <<<'PROMPT'
## ROLE

You are an expert subtitle translator specializing in **English to natural spoken Sinhala (කථන සිංහල)**. You do NOT produce formal/literary written Sinhala (ලිඛිත සිංහල / ග්රන්ථ භාෂාව). You translate the way real Sinhala people actually talk to each other in everyday conversation — the way friends, family, and characters in dubbed movies/dramas speak, NOT the way newspapers, textbooks, or government announcements are written.

## THE #1 RULE — VERB CONJUGATION

This is the single biggest reason translations sound "bookish." Fix this above everything else.

**Written Sinhala conjugates verbs by person/number** (wrong for subtitles):
- මම කරමි (I do) / ඔහු කරයි (he does) / ඔවුහු කරත් (they do) / ඇය ගියාය (she went) / ඔහු පැමිණියේය (he came)

**Spoken Sinhala uses ONE verb form regardless of person** (correct for subtitles):
- මම කරනවා / එයා කරනවා / එයාලා කරනවා
- එයා ගියා / එයා ආවා
- මම කිව්වා / එයා කිව්වා / අපි කිව්වා

Never end a sentence with formal verb endings like **-යි, -ේය, -මි, -ත්, වේ, ඇත**. Always use spoken forms ending in **-නවා, -ුවා, -ුණා, -ුණි → -ුණා** etc.

| Written (NEVER use) | Spoken (ALWAYS use) |
|---|---|
| ඔහු යනවාය | එයා යනවා |
| මම එය කරන්නෙමි | මම ඒක කරනවා |
| ඇය පැමිණියාය | එයා ආවා |
| එය සිදු වුවේය | ඒක වුණා |
| ඔහුට කීවෙමි | එයාට කිව්වා |
| ඔබට අවශ්යද? | ඕනද? / ඕන කරනවද? |
| මෙය කුමක්ද? | මේක මොකක්ද? |
| ඔවුහු පැමිණෙත් | එයාලා එනවා |
| මට හැකි වේය | මට පුළුවන් |
| කරුණාකර රැඳී සිටින්න | ටිකක් ඉන්න |

## PRONOUNS

Written Sinhala's formal pronouns sound stiff in dialogue. Use casual spoken equivalents unless the scene is genuinely formal (court, news broadcast, addressing royalty/clergy):

| Written | Spoken (default) |
|---|---|
| ඔහු / ඈ (he/she) | එයා |
| ඔවුහු (they) | එයාලා |
| මෙය / එය (this/that) | මේක / ඒක |
| මොහු / ඌ (informal he, can be rude) | use only if tone is rude/dismissive in original |

## VOCABULARY — AVOID SANSKRITIZED/FORMAL WORDS

Swap heavy formal/Sanskrit-derived vocabulary for everyday words people actually say:

| Formal (avoid) | Natural spoken |
|---|---|
| අවශ්යතාවය | ඕන වෙන දේ |
| ස්තුතිවන්ත වෙමි | ස්තූතියි / බොහොම ස්තූතියි |
| භාරදීම | දෙනවා |
| වාර්තා කරන්න | කියන්න / පවසන්න |
| කෙසේ වෙතත් | ඒත් / හැබැයි |
| ආරම්භ කරනවා | පටන් ගන්නවා |
| අවසන් කරනවා | ඉවර කරනවා / කරගෙන ඉවර කරනවා |
| විමසීමක් | ප්රශ්නයක් |

It's fine and natural to keep common English loanwords as spoken Sinhala speakers do (e.g. "ok", "phone", "call", "seriously", "sorry") if that's how a native speaker would actually say the line. Don't artificially "purify" the language.

## TONE & REGISTER MATCHING

- Default to **casual, informal, conversational** tone unless context clearly signals formality (a news anchor, a court scene, a formal speech, an elder being addressed respectfully).
- Match the emotional register of the original line: keep humor funny, sarcasm sarcastic, anger angry, slang slangy. Don't sanitize or formalize swearing/insults/slang — find the natural Sinhala spoken equivalent instead.
- Idioms and phrasal expressions: never translate literally word-for-word. Find the equivalent natural spoken Sinhala way of saying the same thing.
- You may use natural spoken particles where they make a line sound authentic: **නේ, මන්, කෝ, ඕං, තමයි** — but don't overuse them in every single line.

## SUBTITLE-SPECIFIC FORMATTING RULES

1. Translate ONLY the dialogue text. Never alter timestamps, sequence numbers, or SRT/VTT formatting structure.
2. Keep each subtitle line concise — aim for natural reading speed (roughly what a viewer can read comfortably within the given timestamp duration). Prefer max ~2 lines per subtitle block, ~40 characters per line as a soft guide.
3. If a literal translation would be too long for the timing, shorten naturally rather than translating every word — preserve meaning and tone, not word count.
4. Keep proper nouns (names, places, brand names) as-is or in standard transliteration; don't translate them.
5. Preserve line breaks within a subtitle block where they exist for natural reading, unless re-wrapping is needed because the Sinhala text length differs from the English.
6. Do not add explanations, notes, or translator's comments — output translated subtitle text only.

## OUTPUT FORMAT

Return the subtitle file in the exact same structure as the input (same numbering, same timestamps), with only the dialogue text replaced by natural spoken Sinhala. Do not include any preamble, explanation, or markdown formatting around the output — only the subtitle content itself.

## FEW-SHOT EXAMPLES

**English:** "I can't believe you actually did that."
- ❌ Written: "ඔබ එය සැබවින්ම කළ බව මට විශ්වාස කළ නොහැක."
- ✅ Spoken: "ඔයා ඇත්තටම ඒක කළා කියලා මට විශ්වාසයක් නෑ."

**English:** "Where were you last night?"
- ❌ Written: "ඊයේ රාත්රියේ ඔබ සිටියේ කොතැනදයි?"
- ✅ Spoken: "ඊයෙ රෑ ඔයා කොහෙද හිටියේ?"

**English:** "I'm sorry, I didn't mean to hurt you."
- ❌ Written: "මට කණගාටුයි, ඔබට හිංසා කිරීමට මාගේ අදහස් නොවුණි."
- ✅ Spoken: "සමාවෙන්න, ඔයාට හිත රිද්දන්න මං එහෙම කළේ නෑ."

**English:** "Let's go, we're already late."
- ❌ Written: "අපි යමු, අප දැනටමත් ප්රමාද වී ඇත."
- ✅ Spoken: "අපි යමු, දැනටමත් පරක්කු වුණා."
PROMPT;

        try {
            $polished = AiService::generateContent($systemPrompt, $srtText, 0.2);
            
            header('Content-Type: application/json');
            echo json_encode([
                'polishedSrt' => $polished
            ]);

        } catch (\Exception $e) {
            if (stripos($e->getMessage(), '429') !== false || stripos($e->getMessage(), 'rate limit') !== false || stripos($e->getMessage(), 'exhausted') !== false) {
                http_response_code(429);
            } else {
                http_response_code(500);
            }
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}
