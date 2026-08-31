<?php
namespace Controllers;

use Config\Database;
use Utils\Cache;

class AdsterraController {
    private const API_BASE = 'https://api3.adsterratools.com/publisher';

    private static function getApiKey() {
        $environmentKey = trim((string)($_ENV['ADSTERRA_API_KEY'] ?? getenv('ADSTERRA_API_KEY') ?: ''));
        if ($environmentKey !== '') {
            return $environmentKey;
        }

        $db = Database::getInstance();
        $setting = $db->findOne('settings', [
            'key' => ['$in' => ['ADSTERRA_API_KEY', 'adsterra_api_key', 'ADSTERRA_API_TOKEN', 'adsterra_api_token']]
        ]);

        return $setting && !empty($setting['value']) ? trim((string)$setting['value']) : '';
    }

    private static function request($path, $query, $apiKey) {
        if (!function_exists('curl_init')) {
            throw new \RuntimeException('The PHP cURL extension is required for Adsterra statistics.');
        }

        $url = self::API_BASE . $path . '?' . http_build_query($query);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'X-API-Key: ' . $apiKey
            ]
        ]);

        $response = curl_exec($ch);
        $curlError = curl_error($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            throw new \RuntimeException('Adsterra request failed: ' . ($curlError ?: 'network error'));
        }

        $decoded = json_decode($response, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Adsterra returned an invalid JSON response.');
        }

        if ($status < 200 || $status >= 300) {
            $message = $decoded['message'] ?? $decoded['error'] ?? ('HTTP ' . $status);
            if (is_array($message)) {
                $message = json_encode($message);
            }
            throw new \RuntimeException('Adsterra request failed: ' . $message);
        }

        return $decoded;
    }

    private static function isList($value) {
        if (!is_array($value)) return false;
        if ($value === []) return true;
        return array_keys($value) === range(0, count($value) - 1);
    }

    private static function extractRows($payload) {
        if (self::isList($payload)) {
            return $payload;
        }

        foreach (['items', 'data', 'result', 'results', 'stats', 'report'] as $key) {
            if (isset($payload[$key]) && is_array($payload[$key])) {
                if (self::isList($payload[$key])) {
                    return $payload[$key];
                }
                foreach (['items', 'rows', 'data'] as $nestedKey) {
                    if (isset($payload[$key][$nestedKey]) && self::isList($payload[$key][$nestedKey])) {
                        return $payload[$key][$nestedKey];
                    }
                }
            }
        }

        return [];
    }

    private static function number($value) {
        if (is_string($value)) {
            $value = str_replace([',', '$', '%'], '', $value);
        }
        return is_numeric($value) ? (float)$value : 0.0;
    }

    public static function getStats() {
        header('Content-Type: application/json');

        $apiKey = self::getApiKey();
        if ($apiKey === '') {
            http_response_code(503);
            echo json_encode([
                'configured' => false,
                'message' => 'Adsterra API key is not configured.'
            ]);
            return;
        }

        $requestedRange = (int)($_GET['range'] ?? 30);
        $range = in_array($requestedRange, [7, 30, 90], true) ? $requestedRange : 30;
        $finishDate = date('Y-m-d');
        $startDate = date('Y-m-d', strtotime('-' . ($range - 1) . ' days'));
        $cacheKey = 'adsterra_stats_v1_' . $range . '_' . substr(hash('sha256', $apiKey), 0, 12);
        $cached = Cache::get($cacheKey);
        if ($cached !== false) {
            echo json_encode($cached);
            return;
        }

        try {
            $payload = self::request('/stats.json', [
                'start_date' => $startDate,
                'finish_date' => $finishDate,
                'group_by' => 'date'
            ], $apiKey);
        } catch (\Throwable $error) {
            http_response_code(502);
            echo json_encode([
                'configured' => true,
                'message' => $error->getMessage()
            ]);
            return;
        }

        $daily = [];
        $totals = [
            'impressions' => 0,
            'clicks' => 0,
            'ctr' => 0,
            'cpm' => 0,
            'revenue' => 0
        ];

        foreach (self::extractRows($payload) as $row) {
            if (!is_array($row)) continue;

            $impressions = self::number($row['impressions'] ?? 0);
            $clicks = self::number($row['clicks'] ?? 0);
            $revenue = self::number($row['revenue'] ?? ($row['profit'] ?? 0));
            $date = (string)($row['date'] ?? ($row['day'] ?? ''));

            $daily[] = [
                'date' => $date,
                'impressions' => (int)round($impressions),
                'clicks' => (int)round($clicks),
                'ctr' => round(self::number($row['ctr'] ?? ($impressions > 0 ? ($clicks / $impressions) * 100 : 0)), 4),
                'cpm' => round(self::number($row['cpm'] ?? ($impressions > 0 ? ($revenue / $impressions) * 1000 : 0)), 4),
                'revenue' => round($revenue, 6)
            ];

            $totals['impressions'] += $impressions;
            $totals['clicks'] += $clicks;
            $totals['revenue'] += $revenue;
        }

        usort($daily, function($a, $b) {
            return strcmp($a['date'], $b['date']);
        });

        $totals['impressions'] = (int)round($totals['impressions']);
        $totals['clicks'] = (int)round($totals['clicks']);
        $totals['revenue'] = round($totals['revenue'], 6);
        $totals['ctr'] = $totals['impressions'] > 0
            ? round(($totals['clicks'] / $totals['impressions']) * 100, 4)
            : 0;
        $totals['cpm'] = $totals['impressions'] > 0
            ? round(($totals['revenue'] / $totals['impressions']) * 1000, 4)
            : 0;

        $result = [
            'configured' => true,
            'currency' => 'USD',
            'range' => $range,
            'period' => ['start' => $startDate, 'finish' => $finishDate],
            'summary' => $totals,
            'daily' => $daily,
            'fetchedAt' => gmdate('c')
        ];

        Cache::set($cacheKey, $result, 300);
        echo json_encode($result);
    }

    public static function saveConfig() {
        header('Content-Type: application/json');
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $apiKey = trim((string)($body['apiKey'] ?? ''));

        if (!preg_match('/^[A-Za-z0-9_-]{20,200}$/', $apiKey)) {
            http_response_code(400);
            echo json_encode(['message' => 'Enter a valid Adsterra API key.']);
            return;
        }

        $db = Database::getInstance();
        $existing = $db->findOne('settings', ['key' => 'ADSTERRA_API_KEY']);
        if ($existing) {
            $db->updateOne('settings', ['_id' => $existing['_id']], ['value' => $apiKey]);
        } else {
            $db->insertOne('settings', ['key' => 'ADSTERRA_API_KEY', 'value' => $apiKey]);
        }

        echo json_encode([
            'configured' => true,
            'message' => 'Adsterra API key saved securely.'
        ]);
    }
}
