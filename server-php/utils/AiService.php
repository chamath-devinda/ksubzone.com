<?php
namespace Utils;

class AiService {
    private static function getApiKey() {
        $apiKey = $_ENV['GEMINI_API_KEY'] ?? null;
        if (!$apiKey || $apiKey === 'your_gemini_api_key_here') {
            try {
                $db = \Config\Database::getInstance();
                $setting = $db->findOne('settings', ['key' => ['$in' => ['GEMINI_API_KEY', 'gemini_api_key', 'gemini_apikey', 'gemini']]]);
                if ($setting && !empty($setting['value'])) {
                    $apiKey = trim($setting['value']);
                }
            } catch (\Exception $e) {
                // Fallback gracefully if database lookup fails
            }
        }
        return $apiKey;
    }

    public static function generateContent($systemInstruction, $userPrompt, $temperature = 0.7) {
        $apiKey = self::getApiKey();
        
        if (!$apiKey || $apiKey === 'your_gemini_api_key_here') {
            throw new \Exception("Gemini API Key is not configured. Please add GEMINI_API_KEY to your .env file or settings under RAW CONFIG KEYS.");
        }

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $apiKey;

        $payload = [
            "contents" => [
                [
                    "role" => "user",
                    "parts" => [
                        ["text" => $userPrompt]
                    ]
                ]
            ],
            "systemInstruction" => [
                "parts" => [
                    ["text" => $systemInstruction]
                ]
            ],
            "generationConfig" => [
                "temperature" => $temperature,
                "topK" => 40,
                "topP" => 0.95,
                "maxOutputTokens" => 8192,
                "thinkingConfig" => [
                    "thinkingBudget" => 0
                ]
            ]
        ];

        $maxRetries = 5;
        $retryDelay = 2.0; // initial retry delay in seconds
        
        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json'
            ]);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            // Ignore SSL verification for local dev if needed
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($error) {
                if ($attempt === $maxRetries) {
                    throw new \Exception("cURL Error: " . $error);
                }
                usleep((int)($retryDelay * 1000000));
                $retryDelay *= 2.0;
                continue;
            }

            $data = json_decode($response, true);

            if ($httpCode === 429) {
                if ($attempt === $maxRetries) {
                    $errorMessage = $data['error']['message'] ?? 'Unknown API error (429 rate limit)';
                    throw new \Exception("Gemini API Error (429): " . $errorMessage);
                }
                // Wait on rate limiting (429) and retry with exponential backoff plus jitter
                $jitter = rand(1, 1000) / 1000.0;
                usleep((int)(($retryDelay + $jitter) * 1000000));
                $retryDelay *= 2.0;
                continue;
            }

            if ($httpCode !== 200) {
                // If it's a transient 5xx error, we could retry too
                if ($httpCode >= 500 && $attempt < $maxRetries) {
                    usleep((int)($retryDelay * 1000000));
                    $retryDelay *= 2.0;
                    continue;
                }
                $errorMessage = $data['error']['message'] ?? 'Unknown API error';
                throw new \Exception("Gemini API Error ({$httpCode}): " . $errorMessage);
            }

            if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
                return $data['candidates'][0]['content']['parts'][0]['text'];
            }

            throw new \Exception("Unexpected response format from Gemini API");
        }

        throw new \Exception("Failed to generate content from Gemini API after {$maxRetries} attempts.");
    }
}
