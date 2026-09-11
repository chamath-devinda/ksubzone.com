<?php
namespace Controllers;
use Config\Database;
use Utils\Cache;
use Utils\AdsterraReport;

class AdsterraController {
    private static function getApiKey(): string {
        // Saved replacements take precedence so Update key takes effect.
        $setting = Database::getInstance()->findOne('settings', ['key' => 'ADSTERRA_API_KEY']);
        if (!empty($setting['value'])) return trim((string)$setting['value']);
        return trim((string)($_ENV['ADSTERRA_API_KEY'] ?? getenv('ADSTERRA_API_KEY') ?: ''));
    }
    private static function request(array $query, string $key): array {
        if (!function_exists('curl_init')) throw new \RuntimeException('provider_unavailable');
        for ($attempt = 0; $attempt < 2; $attempt++) {
            $ch = curl_init('https://api3.adsterratools.com/publisher/stats.json?' . http_build_query($query));
            $options = [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_TIMEOUT => 7,
                CURLOPT_HTTPHEADER => ['Accept: application/json', 'X-API-Key: ' . $key]];
            $ca = trim((string)($_ENV['ADSTERRA_CA_BUNDLE'] ?? getenv('ADSTERRA_CA_BUNDLE') ?: ''));
            if ($ca !== '' && is_file($ca)) $options[CURLOPT_CAINFO] = $ca;
            elseif (defined('CURLSSLOPT_NATIVE_CA')) $options[CURLOPT_SSL_OPTIONS] = CURLSSLOPT_NATIVE_CA;
            curl_setopt_array($ch, $options);
            $body = curl_exec($ch);
            $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($status === 429) throw new \RuntimeException('rate_limited');
            if ($status === 401 || $status === 403) throw new \RuntimeException('configuration_required');
            if ($body === false || $status >= 500) {
                if ($attempt === 0) { usleep(250000); continue; }
                throw new \RuntimeException('provider_unavailable');
            }
            if ($status < 200 || $status >= 300) throw new \RuntimeException('request_failed');
            $data = json_decode($body, true);
            if (!is_array($data)) throw new \RuntimeException('request_failed');
            return $data;
        }
        throw new \RuntimeException('provider_unavailable');
    }
    public static function getStats() {
        header('Content-Type: application/json');
        header('Cache-Control: no-store');
        $configured = false;
        try {
            $key = self::getApiKey();
            if ($key === '') throw new \RuntimeException('configuration_required');
            $configured = true;
            $range = (int)($_GET['range'] ?? 30);
            if (!in_array($range, [7, 30, 90], true)) {
                http_response_code(400);
                echo json_encode(['state' => 'request_failed', 'message' => 'Select 7, 30 or 90 days.']);
                return;
            }
            $finish = gmdate('Y-m-d');
            $start = gmdate('Y-m-d', strtotime('-' . ($range - 1) . ' days'));
            $cacheKey = 'adsterra_v3_' . $finish . '_' . $range . '_' . substr(hash('sha256', $key), 0, 12);
            $cached = Cache::get($cacheKey);
            if ($cached !== false && ($_GET['refresh'] ?? '') !== '1') { echo json_encode($cached); return; }
            $payload = self::request(['start_date' => $start, 'finish_date' => $finish, 'group_by' => 'date'], $key);
            $report = AdsterraReport::normalize($payload, $start, $finish);
            $result = array_merge($report, ['configured' => true,
                'state' => $report['summary']['impressions'] > 0 || $report['summary']['revenue'] > 0 ? 'connected' : 'no_activity',
                'currency' => 'USD', 'range' => $range, 'period' => ['start' => $start, 'finish' => $finish], 'fetchedAt' => gmdate('c')]);
            Cache::set($cacheKey, $result, 300);
            echo json_encode($result);
        } catch (\Throwable $error) {
            $messages = ['configuration_required' => 'Connect a valid Adsterra publisher API key.',
                'rate_limited' => 'Adsterra is limiting requests. Please try again later.',
                'provider_unavailable' => 'Adsterra is temporarily unavailable. Please retry shortly.',
                'request_failed' => 'The earnings report could not be verified. Please retry.'];
            $state = isset($messages[$error->getMessage()]) ? $error->getMessage() : 'request_failed';
            // Normal integration-state envelopes avoid CDN replacement of 5xx bodies.
            echo json_encode(['configured' => $configured, 'state' => $state, 'message' => $messages[$state]]);
            error_log('Adsterra sync: ' . $state);
        }
    }
}
